#!/usr/bin/env python3
"""
TRACE OCR Test Script
Usage: python test_ocr.py [image_path]

If no image path is given, creates a synthetic test image containing
sample student record data and runs OCR against it.
"""

import os
import sys
import tempfile

from PIL import Image, ImageDraw, ImageFont

from ocr_engine import extract_text, parse_student_data


# ---------------------------------------------------------------------------
# Synthetic Test Image Generator
# ---------------------------------------------------------------------------

def create_test_image():
    """
    Generate a synthetic 800×600 test image containing sample student
    record text for OCR testing.

    Returns:
        str: Path to the temporary PNG image file.
    """
    width, height = 800, 600
    image = Image.new('RGB', (width, height), color='white')
    draw = ImageDraw.Draw(image)

    # Use a default font (truetype may not be available on all systems)
    try:
        font_large = ImageFont.truetype("DejaVuSans-Bold.ttf", 22)
        font_medium = ImageFont.truetype("DejaVuSans.ttf", 18)
        font_normal = ImageFont.truetype("DejaVuSans.ttf", 16)
    except (IOError, OSError):
        # Fallback to the default bitmap font
        font_large = ImageFont.load_default()
        font_medium = ImageFont.load_default()
        font_normal = ImageFont.load_default()

    # --- Draw the sample document text ---
    lines = [
        (font_large,  "PAMANTASAN NG LUNGSOD NG PASIG"),
        (font_medium, "OFFICE OF THE REGISTRAR"),
        (font_normal, ""),
        (font_large,  "TRANSCRIPT OF RECORDS"),
        (font_normal, ""),
        (font_normal, "Student Number: 2024-00123"),
        (font_normal, "Student Name: DELA CRUZ, Juan Miguel"),
        (font_normal, "Program: BS Computer Science"),
    ]

    y_offset = 60
    for font, text in lines:
        if text:
            # Center the text horizontally
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            x = (width - text_width) // 2
            draw.text((x, y_offset), text, fill='black', font=font)
        y_offset += 40

    # Save to a temp file
    temp_fd, temp_path = tempfile.mkstemp(suffix='.png')
    os.close(temp_fd)
    image.save(temp_path, 'PNG')

    return temp_path


# ---------------------------------------------------------------------------
# Test Runner
# ---------------------------------------------------------------------------

def run_test(image_path, is_temp=False):
    """
    Run the OCR pipeline on the given image and print formatted results.

    Args:
        image_path (str): Path to the image file to process.
        is_temp (bool): Whether the image is a generated temp file
                        (will be cleaned up after the test).
    """
    filename = os.path.basename(image_path)

    print()
    print("═══════════════════════════════════════")
    print(" TRACE OCR Engine — Test Results")
    print("═══════════════════════════════════════")
    print()
    print(f"📄 Source: {filename}")
    if is_temp:
        print("   (synthetic test image)")

    # --- Step 1: Extract raw text ---
    raw_text = extract_text(image_path)

    print()
    print("── Raw OCR Output ──────────────────")
    if raw_text:
        print(raw_text)
    else:
        print("  [No text extracted]")

    # --- Step 2: Parse structured data ---
    parsed = parse_student_data(raw_text)

    print()
    print("── Extracted Data ─────────────────")
    print(f"  Student ID:  {parsed['student_id'] or 'NOT FOUND'}")
    print(f"  Last Name:   {parsed['last_name'] or 'NOT FOUND'}")
    print(f"  Form Type:   {parsed['form_type'] or 'NOT FOUND'}")

    fields_found = sum(
        1 for v in [parsed['student_id'], parsed['last_name'], parsed['form_type']]
        if v is not None
    )
    print(f"  Confidence:  {fields_found}/3 fields matched")

    # --- Result Summary ---
    print()
    print("── Result ─────────────────────────")
    if fields_found == 3:
        print("  ✅ SUCCESS — All fields extracted")
    elif fields_found > 0:
        print(f"  ❌ PARTIAL — Only {fields_found}/3 fields found")
    else:
        print("  ❌ FAILED — No fields could be extracted")
    print("═══════════════════════════════════════")
    print()


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------

def main():
    """Entry point for the test script."""
    temp_image_path = None

    try:
        if len(sys.argv) > 1:
            # Use the user-supplied image path
            image_path = sys.argv[1]
            if not os.path.isfile(image_path):
                print(f"❌ Error: File not found — {image_path}")
                sys.exit(1)
            run_test(image_path, is_temp=False)
        else:
            # Generate a synthetic test image
            print("No image path provided. Generating synthetic test image...")
            temp_image_path = create_test_image()
            run_test(temp_image_path, is_temp=True)

    finally:
        # Clean up the temporary image if one was created
        if temp_image_path and os.path.exists(temp_image_path):
            os.remove(temp_image_path)
            print("🧹 Temporary test image cleaned up.")


if __name__ == '__main__':
    main()
