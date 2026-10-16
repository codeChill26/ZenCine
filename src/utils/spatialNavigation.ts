/**
 * ZenCine Spatial Navigation Engine (D-Pad Controller)
 * Cung cấp khả năng di chuyển focus 2D thông minh cho Remote Android TV / Smart TV
 * Tự động tìm kiếm phần tử gần nhất theo hướng mũi tên Lên, Xuống, Trái, Phải
 */

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'a[href]:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex="0"]:not([disabled])',
  '[role="button"]:not([disabled])',
  '.art-custom-fs-btn',
  '.art-capsule-btn',
  '.art-speed-pill-btn',
  '.art-control-playAndPause',
].join(', ');

interface Rect {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
  cx: number;
  cy: number;
}

function getRect(el: Element): Rect {
  const r = el.getBoundingClientRect();
  return {
    left: r.left,
    top: r.top,
    right: r.right,
    bottom: r.bottom,
    width: r.width,
    height: r.height,
    cx: r.left + r.width / 2,
    cy: r.top + r.height / 2,
  };
}

function isElementVisible(el: HTMLElement): boolean {
  if (el.offsetParent === null && window.getComputedStyle(el).position !== 'fixed') {
    return false;
  }
  const style = window.getComputedStyle(el);
  if (style.visibility === 'hidden' || style.display === 'none' || parseFloat(style.opacity || '1') === 0) {
    return false;
  }
  const rect = el.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return false;
  }
  return true;
}

export function getAllFocusableElements(): HTMLElement[] {
  // Nếu video đang ở chế độ toàn màn hình, chỉ tìm kiếm các nút điều khiển trong player
  const fsPlayer = document.querySelector('.art-video-player.art-fullscreen');
  const root = fsPlayer || document;

  const rawElements = Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)) as HTMLElement[];
  return rawElements.filter(isElementVisible);
}

export function moveFocus(direction: 'up' | 'down' | 'left' | 'right'): boolean {
  document.body.classList.add('tv-mode');

  const elements = getAllFocusableElements();
  if (elements.length === 0) return false;

  const currentActive = document.activeElement as HTMLElement | null;
  const isCurrentFocusable = currentActive && elements.includes(currentActive);

  // Nếu chưa có phần tử nào được focus, ưu tiên focus phần tử đầu tiên hợp lý
  if (!isCurrentFocusable) {
    // Ưu tiên nút Quay lại hoặc Tập đang chọn nếu có trên WatchPage
    const preferred =
      document.querySelector('[data-tv-preferred="true"]') as HTMLElement ||
      document.querySelector('.ring-1.ring-red-400') as HTMLElement || // Active episode
      elements[0];

    if (preferred && isElementVisible(preferred)) {
      preferred.focus();
      preferred.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
      return true;
    }
    return false;
  }

  const curRect = getRect(currentActive);
  let bestCandidate: HTMLElement | null = null;
  let bestScore = Infinity;

  for (const cand of elements) {
    if (cand === currentActive) continue;
    const candRect = getRect(cand);

    let dPrimary = 0;
    let dSecondary = 0;
    let isSameAxis = false;
    let isValid = false;

    switch (direction) {
      case 'right':
        if (candRect.cx > curRect.cx + 4) {
          isValid = true;
          dPrimary = Math.max(0, candRect.left - curRect.right);
          dSecondary = Math.abs(candRect.cy - curRect.cy);
          isSameAxis = candRect.top < curRect.bottom && candRect.bottom > curRect.top;
        }
        break;

      case 'left':
        if (candRect.cx < curRect.cx - 4) {
          isValid = true;
          dPrimary = Math.max(0, curRect.left - candRect.right);
          dSecondary = Math.abs(candRect.cy - curRect.cy);
          isSameAxis = candRect.top < curRect.bottom && candRect.bottom > curRect.top;
        }
        break;

      case 'down':
        if (candRect.cy > curRect.cy + 4) {
          isValid = true;
          dPrimary = Math.max(0, candRect.top - curRect.bottom);
          dSecondary = Math.abs(candRect.cx - curRect.cx);
          isSameAxis = candRect.left < curRect.right && candRect.right > curRect.left;
        }
        break;

      case 'up':
        if (candRect.cy < curRect.cy - 4) {
          isValid = true;
          dPrimary = Math.max(0, curRect.top - candRect.bottom);
          dSecondary = Math.abs(candRect.cx - curRect.cx);
          isSameAxis = candRect.left < curRect.right && candRect.right > curRect.left;
        }
        break;
    }

    if (isValid) {
      // Công thức tính khoảng cách 2D với trọng số hướng phụ (secondary penalty)
      let score = dPrimary + dSecondary * 2.2;
      // Nếu nằm thẳng hàng (cùng dòng hoặc cùng cột), giảm 50% điểm khoảng cách để ưu tiên
      if (isSameAxis) {
        score *= 0.5;
      }

      if (score < bestScore) {
        bestScore = score;
        bestCandidate = cand;
      }
    }
  }

  if (bestCandidate) {
    bestCandidate.focus();
    bestCandidate.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    return true;
  }

  return false;
}

/**
 * Khởi tạo Spatial Navigation toàn ứng dụng
 */
export function initSpatialNavigation(): () => void {
  const handleKeyDown = (e: KeyboardEvent) => {
    // Không can thiệp khi đang gõ phím trong ô tìm kiếm
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        // Cho phép thoát khỏi ô input khi bấm phím mũi tên Lên/Xuống
        const dir = e.key === 'ArrowDown' ? 'down' : 'up';
        moveFocus(dir);
        e.preventDefault();
      }
      return;
    }

    // Các phím điều hướng D-Pad của Remote TV
    if (e.key === 'ArrowRight' || e.keyCode === 39) {
      if (moveFocus('right')) e.preventDefault();
    } else if (e.key === 'ArrowLeft' || e.keyCode === 37) {
      if (moveFocus('left')) e.preventDefault();
    } else if (e.key === 'ArrowDown' || e.keyCode === 40) {
      if (moveFocus('down')) e.preventDefault();
    } else if (e.key === 'ArrowUp' || e.keyCode === 38) {
      if (moveFocus('up')) e.preventDefault();
    } else if (e.key === 'Enter' || e.keyCode === 13) {
      // Phím OK ở tâm D-Pad: Tự động kích hoạt click trên phần tử đang focus
      const active = document.activeElement as HTMLElement | null;
      if (active && active !== document.body) {
        // Nếu là div role=button hoặc tabindex=0 không tự click bởi trình duyệt
        if (active.tagName !== 'BUTTON' && active.tagName !== 'A' && active.tagName !== 'INPUT') {
          e.preventDefault();
          active.click();
        }
      }
    }
  };

  window.addEventListener('keydown', handleKeyDown);

  return () => {
    window.removeEventListener('keydown', handleKeyDown);
  };
}
