from PIL import Image
import os
import sys

def compress_image(image_path, output_path=None, max_width=1920, quality=80):
    if not os.path.exists(image_path):
        print(f"Error: {image_path} does not exist.")
        return

    if output_path is None:
        output_path = image_path

    try:
        with Image.open(image_path) as img:
            # Resize if too big
            if img.width > max_width:
                ratio = max_width / img.width
                new_height = int(img.height * ratio)
                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
                print(f"Resized to {max_width}x{new_height}")

            # Save with optimization
            img.save(output_path, "JPEG", optimize=True, quality=quality)
            print(f"Saved compressed image to {output_path}")
            
            # Print new size
            print(f"New size: {os.path.getsize(output_path) / 1024:.2f} KB")

    except Exception as e:
        print(f"Error compressing image: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 compress_image.py <input_path>")
    else:
        compress_image(sys.argv[1])
