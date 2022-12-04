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

        self.begin = None
        self.boxes = []

        self.initUI()

    def openImage(self):
        file_name, _ = QFileDialog.getOpenFileName(self, "Open Image")
        if file_name:
            self.image = QPixmap(file_name, 'JPG')
            self.drawing = False
            self.update()

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.drawing = True
            self.begin = event.pos()
            self.start_y = event.y()

    def mouseMoveEvent(self, event):
        self.end = event.pos()

    def mouseReleaseEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.drawing = False
            end = event.pos()
            self.boxes.append((self.begin, end))

    def paintEvent(self, event):
        print("paintEvent")
        painter = QPainter(self)

        if self.image:
            pix = self.image.scaled(self.centralWidget().rect().size(),
                                    Qt.KeepAspectRatio,
                                    Qt.SmoothTransformation)
            painter.drawPixmap(0, 0, pix)
            brush = QBrush(QColor(100, 10, 10, 70))
            print(self.boxes)
            for (start, end) in self.boxes:
                painter.drawRect(QRect(start, end))

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
    mw.resize(QSize())

    mw.show()
    app.exec_()
