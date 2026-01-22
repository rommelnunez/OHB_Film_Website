import fitz # pymupdf
import sys
import os

def pdf_to_md(pdf_path):
    if not os.path.exists(pdf_path):
        print(f"Error: File not found: {pdf_path}")
        return

    base_name = os.path.splitext(os.path.basename(pdf_path))[0]
    output_dir = os.path.dirname(pdf_path)
    md_filename = os.path.join(output_dir, f"{base_name}.md")
    images_dir = os.path.join(output_dir, f"{base_name}_images")

    if not os.path.exists(images_dir):
        os.makedirs(images_dir)

    doc = fitz.open(pdf_path)
    md_content = f"# {base_name}\n\n"

    print(f"Processing {pdf_path}...")

    for page_index in range(len(doc)):
        page = doc[page_index]
        md_content += f"## Page {page_index + 1}\n\n"
        
        # Text
        text = page.get_text()
        md_content += text + "\n\n"

        # Images
        image_list = page.get_images(full=True)
        for img_index, img in enumerate(image_list):
            xref = img[0]
            try:
                base_image = doc.extract_image(xref)
                image_bytes = base_image["image"]
                image_ext = base_image["ext"]
                image_filename = f"page{page_index+1}_img{img_index+1}.{image_ext}"
                image_path = os.path.join(images_dir, image_filename)
                
                with open(image_path, "wb") as f:
                    f.write(image_bytes)
                
                # Relative path for MD: escape spaces if any in folder name
                rel_path = f"{os.path.basename(images_dir)}/{image_filename}"
                md_content += f"![Image {img_index+1}]({rel_path})\n\n"
            except Exception as e:
                print(f"Error extracting image index {img_index} on page {page_index}: {e}")

    with open(md_filename, "w") as f:
        f.write(md_content)
    
    print(f"Created {md_filename}")
    print(f"Extracted images to {images_dir}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python3 scripts/pdf_to_md.py <path_to_pdf>")
    else:
        pdf_to_md(sys.argv[1])
