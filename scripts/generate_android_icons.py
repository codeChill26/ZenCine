import os
from PIL import Image, ImageDraw, ImageFont

BASE_DIR = r"d:\FPT MATERIALS\MyOwn\ZenCine"
RES_DIR = os.path.join(BASE_DIR, "android", "app", "src", "main", "res")
BASE_ICON_PATH = os.path.join(BASE_DIR, "public", "icon-512.png")

def make_rounded_icon(base_img, size, radius_pct=0.20):
    """Generates legacy square icon with smooth squircle corners."""
    scale = 4
    canvas_size = size * scale
    resized = base_img.resize((canvas_size, canvas_size), Image.Resampling.LANCZOS)
    
    mask = Image.new('L', (canvas_size, canvas_size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.rounded_rectangle([0, 0, canvas_size, canvas_size], radius=int(canvas_size * radius_pct), fill=255)
    
    out = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    out.paste(resized, (0, 0), mask)
    return out.resize((size, size), Image.Resampling.LANCZOS)

def make_circular_icon(base_img, size):
    """Generates legacy round icon with antialiased circular mask."""
    scale = 4
    canvas_size = size * scale
    resized = base_img.resize((canvas_size, canvas_size), Image.Resampling.LANCZOS)
    
    mask = Image.new('L', (canvas_size, canvas_size), 0)
    mdraw = ImageDraw.Draw(mask)
    mdraw.ellipse([0, 0, canvas_size, canvas_size], fill=255)
    
    out = Image.new('RGBA', (canvas_size, canvas_size), (0, 0, 0, 0))
    out.paste(resized, (0, 0), mask)
    return out.resize((size, size), Image.Resampling.LANCZOS)

def make_adaptive_foreground(base_img, size):
    """Generates adaptive icon foreground (108dp canvas with safe zone ~72dp)."""
    # icon-512.png emblem is already centered in 512x512 with safe margins (59.7% bbox)
    return base_img.resize((size, size), Image.Resampling.LANCZOS)

def make_tv_banner(base_img, width=640, height=360):
    """Generates Android TV Leanback Banner (16:9)."""
    banner = Image.new('RGBA', (width, height), (0, 0, 0, 255))
    
    # Subtle ambient red cinema glow
    glow = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([80, 70, 300, 290], fill=(229, 9, 20, 45))
    banner = Image.alpha_composite(banner, glow)
    
    # Extract emblem from base_img
    emblem = base_img.crop((100, 100, 412, 412))
    emblem_scaled = emblem.resize((200, 200), Image.Resampling.LANCZOS)
    banner.paste(emblem_scaled, (90, 80))
    
    draw = ImageDraw.Draw(banner)
    font_large = None
    font_small = None
    for fp in ['C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/arialbd.ttf']:
        if os.path.exists(fp):
            try:
                font_large = ImageFont.truetype(fp, 64)
                font_small = ImageFont.truetype(fp, 20)
                break
            except:
                pass
                
    if font_large:
        draw.text((310, 120), 'ZenCine', fill=(229, 9, 20, 255), font=font_large)
        draw.text((314, 195), 'CINEMA & TV EXPERIENCE', fill=(180, 190, 205, 210), font=font_small)
        
    return banner

def make_splash_screen(base_img, width, height):
    """Generates splash screen with centered ZenCine emblem on dark canvas."""
    img = Image.new('RGBA', (width, height), (0, 0, 0, 255))
    
    cx, cy = width / 2.0, height / 2.0
    emblem_size = int(min(width, height) * 0.45)
    
    # Ambient glow
    glow_rad = emblem_size * 0.9
    glow = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([cx - glow_rad, cy - glow_rad, cx + glow_rad, cy + glow_rad], fill=(229, 9, 20, 30))
    img = Image.alpha_composite(img, glow)
    
    # Scaled emblem
    emblem = base_img.crop((100, 100, 412, 412))
    emblem_scaled = emblem.resize((emblem_size, emblem_size), Image.Resampling.LANCZOS)
    
    img.paste(emblem_scaled, (int(cx - emblem_size / 2.0), int(cy - emblem_size / 2.0)))
    return img

def main():
    base_img = Image.open(BASE_ICON_PATH).convert('RGBA')
    
    densities = {
        'mipmap-mdpi': {'legacy': 48, 'fg': 108},
        'mipmap-hdpi': {'legacy': 72, 'fg': 162},
        'mipmap-xhdpi': {'legacy': 96, 'fg': 216},
        'mipmap-xxhdpi': {'legacy': 144, 'fg': 324},
        'mipmap-xxxhdpi': {'legacy': 192, 'fg': 432},
    }
    
    print("Generating Android mipmap launcher icons...")
    for folder, sizes in densities.items():
        folder_path = os.path.join(RES_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        # 1. ic_launcher.png (legacy rounded squircle)
        icon = make_rounded_icon(base_img, sizes['legacy'])
        icon.save(os.path.join(folder_path, 'ic_launcher.png'), 'PNG')
        
        # 2. ic_launcher_round.png (legacy round circle)
        icon_round = make_circular_icon(base_img, sizes['legacy'])
        icon_round.save(os.path.join(folder_path, 'ic_launcher_round.png'), 'PNG')
        
        # 3. ic_launcher_foreground.png (adaptive icon foreground)
        fg = make_adaptive_foreground(base_img, sizes['fg'])
        fg.save(os.path.join(folder_path, 'ic_launcher_foreground.png'), 'PNG')
        print(f"Generated {folder}: legacy {sizes['legacy']}px, round {sizes['legacy']}px, fg {sizes['fg']}px")

    print("Generating Android TV banner...")
    banner = make_tv_banner(base_img, 640, 360)
    banner.save(os.path.join(RES_DIR, 'drawable', 'banner.png'), 'PNG')
    print("Saved banner.png (640x360)")
    
    print("Generating splash screens...")
    splashes = {
        'drawable': (480, 320),
        'drawable-land-mdpi': (480, 320),
        'drawable-land-hdpi': (800, 480),
        'drawable-land-xhdpi': (1280, 720),
        'drawable-land-xxhdpi': (1600, 960),
        'drawable-land-xxxhdpi': (1920, 1280),
        'drawable-port-mdpi': (320, 480),
        'drawable-port-hdpi': (480, 800),
        'drawable-port-xhdpi': (720, 1280),
        'drawable-port-xxhdpi': (960, 1600),
        'drawable-port-xxxhdpi': (1280, 1920),
    }
    for folder, (w, h) in splashes.items():
        folder_path = os.path.join(RES_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)
        splash = make_splash_screen(base_img, w, h)
        splash.save(os.path.join(folder_path, 'splash.png'), 'PNG')
        print(f"Generated {folder}/splash.png ({w}x{h})")

    print("\nAll Android icons and graphics updated successfully!")

if __name__ == '__main__':
    main()
