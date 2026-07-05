import os
import sys
import gc

# Inject local python_packages path into sys.path before importing compiled modules
local_packages = os.path.join(os.path.dirname(__file__), "../python_packages")
if os.path.exists(local_packages):
    sys.path.insert(0, local_packages)

import cv2
import fitz
import numpy as np
from PIL import Image


# Reduced from 300 to 150 DPI to cut memory usage by ~75% on Render's 512MB limit
DPI = 150
PADDING = 15
DENOMINATION_REMOVE_RATIO = 0.14


# =========================
# PDF TO IMAGE
# =========================
def pdf_page_generator(pdf_path, dpi=DPI):
    """
    Generator that yields one page at a time to avoid loading all pages into memory.
    Each page is cleaned up before the next is processed.
    """
    doc = fitz.open(pdf_path)

    zoom = dpi / 72
    mat = fitz.Matrix(zoom, zoom)

    for page_num in range(len(doc)):
        page = doc[page_num]

        pix = page.get_pixmap(
            matrix=mat,
            alpha=False
        )

        img = np.frombuffer(
            pix.samples,
            dtype=np.uint8
        )

        img = img.reshape(
            pix.height,
            pix.width,
            3
        )

        # Free pixmap memory immediately
        page = None
        pix = None

        yield img

        # Force garbage collection after yielding to free memory
        img = None
        gc.collect()

    doc.close()


# =========================
# TRIM WHITE SPACE
# =========================
def trim_whitespace(img, padding=PADDING):

    # Safety check: if image is empty or too small, return as-is
    if img is None or img.size == 0 or img.shape[0] < 10 or img.shape[1] < 10:
        return img

    gray = cv2.cvtColor(
        img,
        cv2.COLOR_RGB2GRAY
    )

    _, thresh = cv2.threshold(
        gray,
        245,
        255,
        cv2.THRESH_BINARY_INV
    )

    coords = cv2.findNonZero(thresh)

    if coords is None:
        return img

    x, y, w, h = cv2.boundingRect(coords)

    # preserve upper content
    top_extra = 20

    x = max(0, x - padding)

    y = max(0, y - top_extra)

    w = min(
        img.shape[1] - x,
        w + padding * 2
    )

    h = min(
        img.shape[0] - y,
        h + padding + top_extra
    )

    return img[y:y+h, x:x+w]

# =========================
# REMOVE DENOMINATION AREA
# =========================
def remove_denomination(img):

    h, w = img.shape[:2]

    cut = int(w * (1 - DENOMINATION_REMOVE_RATIO))

    return img[:, :cut]


# =========================
# VALIDATE SLIP
# =========================
# def is_valid_slip(img):

#     gray = cv2.cvtColor(
#         img,
#         cv2.COLOR_RGB2GRAY
#     )

#     _, thresh = cv2.threshold(
#         gray,
#         220,
#         255,
#         cv2.THRESH_BINARY_INV
#     )

#     non_zero = cv2.countNonZero(thresh)

#     h, w = img.shape[:2]

#     area = h * w

#     density = non_zero / area

#     # Reject almost empty crops
#     if density < 0.015:
#         return False

#     # Reject tiny crops
#     if h < 180 or w < 600:
#         return False

#     return True


# =========================
# CROP SINGLE SLIP
# =========================
# def crop_single_slip(region, slip_idx):

#     region_h = region.shape[0]

#     # Different crop values for each slip
#     if slip_idx == 0:

#         crop_top = int(region_h * 0.03)
#         crop_bottom = int(region_h * 0.74)

#     elif slip_idx == 1:

#         crop_top = int(region_h * 0.01)
#         crop_bottom = int(region_h * 0.72)

#     else:

#         crop_top = int(region_h * 0.005)
#         crop_bottom = int(region_h * 0.70)

#     slip = region[crop_top:crop_bottom, :]

#     # Remove denomination section properly
#     remove_right = int(slip.shape[1] * 0.12)

#     slip = slip[:, :-remove_right]

#     # Trim whitespace lightly
#     slip = trim_whitespace(
#         slip,
#         padding=8
#     )

#     return slip


# =========================
# EXTRACT 3 SLIPS
# =========================
def process_slip_pdf(pdf_path, output_dir):

    global_index = 1

    # Normalized region ratios (x1, y1, x2, y2 as fractions of page width/height)
    # Derived from original 300 DPI values: e.g. (120/2480≈0.048, 70/3508≈0.020, etc.)
    # These work at ANY DPI since they're relative to actual image dimensions
    slip_region_ratios = [

        # slip 1
        (0.030, 0.0080, 0.920, 0.400),

        # slip 2
        (0.048, 0.302, 0.806, 0.554),

        # slip 3
        (0.048, 0.570, 0.806, 0.887)
    ]

    for img in pdf_page_generator(pdf_path):

        h, w = img.shape[:2]

        for region in slip_region_ratios:

            rx1, ry1, rx2, ry2 = region

            x1 = int(rx1 * w)
            y1 = int(ry1 * h)
            x2 = int(rx2 * w)
            y2 = int(ry2 * h)

            # Bounds clamping to prevent out-of-range errors at any DPI
            x1 = max(0, min(x1, w - 1))
            y1 = max(0, min(y1, h - 1))
            x2 = max(x1 + 1, min(x2, w))
            y2 = max(y1 + 1, min(y2, h))

            slip = img[y1:y2, x1:x2]

            # Light trim only
            slip = trim_whitespace(
                slip,
                padding=10
            )

            pil = Image.fromarray(slip)

            filename = f"{global_index:04d}.png"

            output_path = os.path.join(
                output_dir,
                filename
            )

            pil.save(
                output_path,
                "PNG"
            )

            print("Saved:", filename)

            global_index += 1

        # Free the page image and force GC before next iteration
        img = None
        gc.collect()

# =========================
# EXTRACT REPORTS
# =========================
def process_report_pdf(pdf_path, output_dir):

    idx = 0

    for img in pdf_page_generator(pdf_path):

        idx += 1

        trimmed = trim_whitespace(
            img,
            padding=10
        )

        pil = Image.fromarray(trimmed)

        filename = f"{idx:04d}_report.png"

        output_path = os.path.join(
            output_dir,
            filename
        )

        pil.save(
            output_path,
            "PNG"
        )

        print("Saved:", filename)

        # Free memory before next page
        img = None
        trimmed = None
        gc.collect()


# =========================
# RESIZE KEEP RATIO
# =========================
def resize_keep(img, width):

    ratio = width / img.width

    return img.resize(
        (
            width,
            int(img.height * ratio)
        ),
        Image.Resampling.LANCZOS
    )


# =========================
# MERGE OUTPUTS
# =========================
def merge_outputs(
    slips_dir,
    reports_dir,
    output_dir
):

    merged_pages = []

    index = 1

    while True:

        slip_path = os.path.join(
            slips_dir,
            f"{index:04d}.png"
        )

        report_path = os.path.join(
            reports_dir,
            f"{index:04d}_report.png"
        )

        if not os.path.exists(slip_path):
            break

        # STRICT matching
        if not os.path.exists(report_path):

            print(
                f"Missing report for {index}"
            )

            index += 1

            continue

        slip = Image.open(
            slip_path
        ).convert("RGB")

        report = Image.open(
            report_path
        ).convert("RGB")

        target_width = max(
            slip.width,
            report.width
        )

        slip = resize_keep(
            slip,
            target_width
        )

        report = resize_keep(
            report,
            target_width
        )

        gap = 20

        canvas_width = target_width + 40

        bottom_margin = 150

        canvas_height = (
            slip.height +
            report.height +
            gap +
            20 +
            bottom_margin
        )

        canvas = Image.new(
            "RGB",
            (
                canvas_width,
                canvas_height
            ),
            "white"
        )

        y = 20

        canvas.paste(
            slip,
            (
                (canvas_width - slip.width) // 2,
                y
            )
        )

        y += slip.height + gap

        canvas.paste(
            report,
            (
                (canvas_width - report.width) // 2,
                y
            )
        )

        merged_pages.append(canvas)

        print("Merged:", index)

        index += 1

    if merged_pages:

        output_pdf = os.path.join(
            output_dir,
            "final_output.pdf"
        )

        merged_pages[0].save(
            output_pdf,
            save_all=True,
            append_images=merged_pages[1:]
        )

        print(
            "Saved Final PDF:",
            output_pdf
        )

    # Free merged pages memory immediately
    merged_pages.clear()
    gc.collect()


# =========================
# MAIN
# =========================
if __name__ == "__main__":

    if len(sys.argv) < 4:

        print(
            "Usage: python process_pdfs.py slip.pdf report.pdf output_folder"
        )

        sys.exit(1)

    slip_pdf = sys.argv[1]

    report_pdf = sys.argv[2]

    base_dir = sys.argv[3]

    slips_dir = os.path.join(
        base_dir,
        "slips"
    )

    reports_dir = os.path.join(
        base_dir,
        "reports"
    )

    output_dir = os.path.join(
        base_dir,
        "output"
    )

    os.makedirs(
        slips_dir,
        exist_ok=True
    )

    os.makedirs(
        reports_dir,
        exist_ok=True
    )

    os.makedirs(
        output_dir,
        exist_ok=True
    )

    process_slip_pdf(
        slip_pdf,
        slips_dir
    )

    process_report_pdf(
        report_pdf,
        reports_dir
    )

    merge_outputs(
        slips_dir,
        reports_dir,
        output_dir
    )

    print("DONE")
