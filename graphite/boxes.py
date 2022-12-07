"""Magic with boxes"""
from PyQt5.QtWidgets import *
from PyQt5.QtGui import *
from PyQt5.QtCore import *


def box_corner(box, corner) -> QPoint:
    if corner == Qt.TopLeftCorner:
        return box.topLeft()
    elif corner == Qt.TopRightCorner:
        return box.topRight()
    elif corner == Qt.BottomRightCorner:
        return box.bottomRight()
    elif corner == Qt.BottomLeftCorner:
        return box.bottomLeft()


def set_corner(box, corner, point):
    # Set the position of the specified corner of the rectangle
    if corner == Qt.TopLeftCorner:
        box.setTopLeft(point)
    elif corner == Qt.TopRightCorner:
        box.setTopRight(point)
    elif corner == Qt.BottomLeftCorner:
        box.setBottomLeft(point)
    elif corner == Qt.BottomRightCorner:
        box.setBottomRight(point)


def set_text(box):
    text, ok = QInputDialog.getText(None, "Content Entry", "Enter the language content in this box", text=getattr(box, 'text', ''))
    if ok:
        box.text = text


QRect.corner = box_corner
QRect.setCorner = set_corner
QRect.setText = set_text


def biggest_intersecting_fraction(boxes):
    max_intersection = None
    for i, (r1, index) in enumerate(boxes):
        if isinstance(r1, QPolygon):
            r1 = r1.boundingRect()
        for j, (r2, _)  in enumerate(boxes[i+1:]):
            if isinstance(r2, QPolygon):
                r2 = r2.boundingRect()

            inter = r1.intersected(r2)

            s = inter.size()
            s2 = r1.size()

            area_fract = (s.height() * s.width()) / (s2.height() * s2.width())

            if max_intersection is None:
                max_intersection = (area_fract, index)
            elif area_fract > max_intersection[0]:
                max_intersection = (area_fract, index)

    return max_intersection


def rect_to_poly(box) -> QPolygon:
    text = getattr(box, "text", None)
    poly = QPolygon([box.topLeft(), box.topRight(), box.bottomRight(), box.bottomLeft()])
    poly.text = text
    return poly


def poly_to_rect(poly) -> QRect:
    text = getattr(poly, "text", None)
    box = poly.boundingRect()
    box.text = text
    return box

QPolygon.setText = set_text
