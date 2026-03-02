from PIL import Image
import os

input_path = "assets/images/official_poster_large.jpg"
output_path = "assets/images/official_poster_high_res.jpg"

def optimize_poster():
    if not os.path.exists(input_path):
        print(f"Error: {input_path} not found.")
        return

    print(f"Processing {input_path}...")
    
    with Image.open(input_path) as img:
        # Calculate new size while maintaining aspect ratio
        # Target height: 4000px (allows deep zoom on 4K screens)
        target_height = 4000
        aspect_ratio = img.width / img.height
        target_width = int(target_height * aspect_ratio)
        
        print(f"Original size: {img.width}x{img.height}")
        print(f"Target size: {target_width}x{target_height}")
        
        # Resize using LANCZOS for best quality
        img_resized = img.resize((target_width, target_height), Image.Resampling.LANCZOS)
        
        # Save with high quality JPEG compression
        # quality=85 usually gives perceptible lossless quality at much lower size
        img_resized.save(output_path, "JPEG", quality=85, optimize=True)
        
        print(f"Saved optimized poster to {output_path}")
        
        # Check file size
        file_size_mb = os.path.getsize(output_path) / (1024 * 1024)
        print(f"Output file size: {file_size_mb:.2f} MB")

if __name__ == "__main__":
    optimize_poster()
