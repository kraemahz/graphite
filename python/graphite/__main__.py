import json
import sys

import piexif
from piexif import TAGS
TAG_KEY = 65000
TAGS["Exif"][TAG_KEY] = {"name": "Metadata", "type": 2}
from PIL import Image

from PyQt5.QtWidgets import *
from PyQt5.QtGui import *
from PyQt5.QtCore import *

from .boxes import *

class MainWindow(QMainWindow):

    def __init__(self):
        super().__init__()

        self.image = None
        self.name = None
        self.mode = ""

        self.pending = None
        self.boxes = []
        self.selected = None
        self.corner = None

        self.fheight = self.initUI()
        self.current_size = None

    def openImage(self):
        file_name, _ = QFileDialog.getOpenFileName(self, "Open Image")
        if file_name:
            self.name = file_name
            self.image = QPixmap(file_name, 'JPG')
            self.mode = ""

            exif = piexif.load(file_name)
            im = Image.open(self.name)
            try:
                exif = piexif.load(im.info["exif"])["Exif"]
            except KeyError:
                exif = {}

            self.boxes = []
            if TAG_KEY in exif:
                try:
                    json_obj = json.loads(exif[TAG_KEY])
                    self.from_json_boxes(json_obj)
                except (ValueError, KeyError):
                    pass

            self.selected = None
            self.corner = None
            self.pending = None
            self.update()

    def from_json_boxes(self, json_obj):
        boxes = json_obj["boxes"]
        for b in boxes:
            if "points" in b:
                points = [QPoint(*p) for p in b["points"]]
                poly = QPolygon(points)
                poly.text = b["text"]
                self.boxes.append(poly)
            else:
                top_left = b["top_left"]
                bottom_right = b["bottom_right"]
                box = QRect(QPoint(*top_left), QPoint(*bottom_right))
                box.text = b["text"]
                self.boxes.append(box)

    def boxes_dict(self):
        retval = {}
        retval["boxes"] = []
        for b in self.boxes:
            if isinstance(b, QRect):
                top_left = b.topLeft()
                bottom_right = b.bottomRight()
                box_obj = {"top_left": (top_left.x(), top_left.y()),
                           "bottom_right": (bottom_right.x(), bottom_right.y()),
                           "text": getattr(b, "text", "")}
            elif isinstance(b, QPolygon):
                points = []
                for i in range(b.size()):
                    point = b.at(i)
                    points.append((point.x(), point.y()))
                box_obj = {"points": points, "text": getattr(b, "text", "")}
            retval["boxes"].append(box_obj)
        return retval

    def saveAnnotations(self):
        if self.name:
            file_name, _ = QFileDialog.getSaveFileName(self, "Image Path")
            if file_name == "":
                return

            json_str = json.dumps(self.boxes_dict())
            im = Image.open(self.name)
            try:
                exif = piexif.load(im.info["exif"])
            except KeyError:
                exif = {"Exif": {}}
            exif["Exif"][TAG_KEY] = json_str.encode("utf-8")
            exif_bytes = piexif.dump(exif)
            im.save(file_name, quality=100, exif=exif_bytes)

    def keyPressEvent(self, event):
        if self.image is None:
            return

        if self.selected is not None:
            box = self.boxes[self.selected]
            if event.key() == Qt.Key_Delete:
                del self.boxes[self.selected]
                self.update()
                if len(self.boxes):
                    self.selected -= 1
                else:
                    self.selected = None
            elif event.key() == Qt.Key_Enter or event.key() == Qt.Key_Return:
                box.setText()
                self.update()
            elif event.key() == Qt.Key_F:
                if isinstance(box, QRect):
                    self.boxes[self.selected] = rect_to_poly(box)
                elif isinstance(box, QPolygon):
                    self.boxes[self.selected] = poly_to_rect(box)
                self.update()
            elif event.key() == Qt.Key_A and isinstance(box, QPolygon):
                pos = QCursor.pos()
                box.append(self.realPoint(pos))
                self.update()

    def realPoint(self, point):
        return QPoint(self.x_scale(point.x()),
                      self.y_scale(point.y()))

    def x_scale(self, x: int) -> int:
        x_fract = x / self.current_size.width()
        return int(self.image.width() * x_fract)

    def y_scale(self, y: int) -> int:
        y_fract = (y - self.fheight) / self.current_size.height()
        return int(self.image.height() * y_fract)

    def scale_point(self, p: QPoint) -> QPoint:
        x_scale = self.current_size.width() / self.image.width()
        y_scale = self.current_size.height() / self.image.height()
        return QPoint(int(p.x() * x_scale), int(p.y() * y_scale) + self.fheight) 

    def scale_rect(self, rect: QRect) -> QRect:
        top_left = rect.topLeft()
        bottom_right = rect.bottomRight()
        return QRect(self.scale_point(top_left), self.scale_point(bottom_right))

    def mousePressEvent(self, event):
        if self.image is None:
            return

        if event.button() == Qt.LeftButton:
            self.mode = "draw"
            point = self.realPoint(event.pos())

            corner_x = max(3, self.x_scale(3))
            corner_y = max(3, self.y_scale(3 + self.fheight))

            if self.selected is not None:
                box = self.boxes[self.selected]
                if isinstance(box, QRect):
                    rect = box
                    if rect.contains(point):
                        self.mode = "move"
                    for corner in [Qt.TopLeftCorner, Qt.TopRightCorner,
                                   Qt.BottomLeftCorner, Qt.BottomRightCorner]:
                        corner_p = rect.corner(corner)
                        corner_box = QRect(corner_p + QPoint(-corner_x, -corner_y),
                                           corner_p + QPoint(corner_x, corner_y))

                        if corner_box.contains(point):
                            self.mode = "resize"
                            self.corner = corner
                            break
                elif isinstance(box, QPolygon):
                    if box.containsPoint(point, Qt.OddEvenFill):
                        self.mode = "move"

                    for i in range(box.size()):
                        corner_p = box.at(i)
                        corner_box = QRect(corner_p + QPoint(-corner_x, -corner_y),
                                           corner_p + QPoint(corner_x, corner_y))
                        if corner_box.contains(point):
                            self.mode = "resize"
                            self.corner = i
                            break

            self.pending = [point, point]
            if self.mode == "draw":
                self.boxes.append(QRect(*self.pending))

    def mouseMoveEvent(self, event):
        if self.image is None:
            return

        point = self.realPoint(event.pos())
        self.pending[1] = point

        if self.mode == "draw":
            self.boxes[-1] = QRect(*self.pending)
        elif self.selected is not None:
            box = self.boxes[self.selected]
            if isinstance(box, QRect):
                if self.mode == "move":
                    diff = self.pending[1] - self.pending[0]
                    box.translate(diff)
                    self.pending[0] = point
                elif self.mode == "resize":
                    box.setCorner(self.corner, point)
            elif isinstance(box, QPolygon):
                if self.mode == "move":
                    diff = self.pending[1] - self.pending[0]
                    box.translate(diff)
                    self.pending[0] = point
                elif self.mode == "resize":
                    box.setPoint(self.corner, self.pending[1])

        self.update()

    def mouseReleaseEvent(self, event):
        if self.image is None:
            return

        if event.button() == Qt.LeftButton:
            point = self.realPoint(event.pos())
            if self.mode == "draw":
                self.pending[1] = point
                diff = self.pending[1] - self.pending[0]

                if diff.manhattanLength() < 1:
                    self.boxes.pop()
                    selected_candidates = []
                    for i, box in enumerate(self.boxes):
                        if isinstance(box, QPolygon) and box.containsPoint(point, Qt.OddEvenFill):
                            selected_candidates.append((box, i))
                        elif box.contains(point):
                            selected_candidates.append((box, i))

                    if len(selected_candidates) > 1:
                        self.selected = biggest_intersecting_fraction(selected_candidates)[1]
                    elif selected_candidates:
                        self.selected = selected_candidates[0][1]
                else:
                    self.selected = len(self.boxes) - 1

            self.mode = ""
            self.pending = None
            self.corner = None
            self.update()

    def paintEvent(self, event):
        painter = QPainter(self)

        if self.image:
            pix = self.image.scaled(self.centralWidget().rect().size(),
                                    Qt.KeepAspectRatio,
                                    Qt.SmoothTransformation)
            self.current_size = pix.rect().size()
            painter.drawPixmap(0, self.fheight, pix)
            brush = QBrush(QColor(120, 10, 120, 30))
            selected_brush = QBrush(QColor(200, 200, 10, 30))

            for i, box in enumerate(self.boxes):
                if i == self.selected:
                    painter.setBrush(selected_brush)
                else:
                    painter.setBrush(brush)

                if isinstance(box, QRect):
                    rect = box
                    scaled_rect = self.scale_rect(rect)
                    text = getattr(rect, "text", "")

                    painter.drawRect(scaled_rect)
                elif isinstance(box, QPolygon):
                    poly = box
                    new_poly = QPolygon()
                    for ix in range(poly.size()):
                        new_poly.append(self.scale_point(poly.at(ix)))
                    text = getattr(poly, "text", "")
                    scaled_rect = new_poly.boundingRect()
                    painter.drawConvexPolygon(new_poly)

                if i == self.selected:
                    painter.drawText(scaled_rect, Qt.AlignCenter, text)

        painter.end()

    def initUI(self) -> int:
        open_action = QAction("Open", self)
        open_action.triggered.connect(self.openImage)
        save_action = QAction("Save", self)
        save_action.triggered.connect(self.saveAnnotations)

        menu_bar = self.menuBar()
        file_menu = menu_bar.addMenu("File")
        file_menu.addAction(open_action)
        file_menu.addAction(save_action)

        self.setCentralWidget(QWidget())
        self.centralWidget().setMouseTracking(True)
        return menu_bar.height() - 10  # ??? The value is wrong


if __name__ == "__main__":
    app = QApplication(sys.argv)
    mw = MainWindow()
    mw.resize(QSize(1600, 800))

    mw.show()
    app.exec_()
