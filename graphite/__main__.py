import sys
from PIL import Image, ImageDraw, ImageQt

from PyQt5.QtWidgets import *
from PyQt5.QtGui import *
from PyQt5.QtCore import *


class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()

        self.image = None
        self.drawing = False

        self.initUI()

    def openImage(self):
        file_name, _ = QFileDialog.getOpenFileName(self, "Open Image")
        if file_name:
            self.image = QPixmap(file_name, 'JPG')
            self.drawing = False
            self.update()

    def drawBoxes(self, event):
        if self.image and self.drawing:
            x1 = min(self.start_x, event.x())
            y1 = min(self.start_y, event.y())
            x2 = max(self.start_x, event.x())
            y2 = max(self.start_y, event.y())

            self.image_draw.rectangle([(x1, y1), (x2, y2)], outline="red")
            self.update()

    def mousePressEvent(self, event):
        print("mousePressEvent")
        if event.button() == Qt.LeftButton:
            self.drawing = True
            self.start_x = event.x()
            self.start_y = event.y()

    def mouseMoveEvent(self, event):
        print("mouseMoveEvent")
        self.drawBoxes(event)

    def mouseReleaseEvent(self, event):
        print("mouseReleaseEvent")
        if event.button() == Qt.LeftButton:
            self.drawBoxes(event)
            self.drawing = False

    def paintEvent(self, event):
        print("paintEvent")
        painter = QPainter(self)

        if self.image:
            pix = self.image.scaled(self.centralWidget().rect().size(),
                                    Qt.KeepAspectRatio,
                                    Qt.SmoothTransformation)
            painter.drawPixmap(0, 0, pix)
        painter.end()

    def initUI(self):
        open_action = QAction("Open", self)
        open_action.triggered.connect(self.openImage)

        menu_bar = self.menuBar()
        file_menu = menu_bar.addMenu("File")
        file_menu.addAction(open_action)

        self.setCentralWidget(QWidget())
        self.centralWidget().setMouseTracking(True)


if __name__ == "__main__":
    app = QApplication(sys.argv)
    mw = MainWindow()
    mw.show()
    app.exec_()
