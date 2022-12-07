# Graphite

## Intro

This is a PyQt image annotation software that allows adding text annotations to regions of images drawn directly on them. It stores the annotations in the EXIF data of the image (Right now just supports JPG, but PNG and TIFF also can contain EXIF data). The intent of this is to assist in the creation of labeled data for training NLP systems on understanding complex plots, handwriting, and more.

This was created as an experiment with ChatGPT providing help and snippets of code to get started. ChatGPT did write the initial start of the code, however there was significant human debugging and refactoring through the process (and I quickly gave up trying to get it to write *all* the code).

## HowTo

This opens images with `File->Open`. The window will open to a default size but can be resized and the image and all the boxes will scale with it.

Click and drag on the image to make a new box. Pale orange is selected and pale mauve is deselected. If you don't like those colors, sorry, modifying it in the code is easy until that's got a dialog.

Click on a box to select it. Click inside a *selected* box to move it. Click the edges of a *selected* box to change its size. Use the *delete* key to remove the box. Use the *enter* key to add text to a box, a window will pop up. On the *selected* box the F key will convert it to a polygon for drawing irregular shapes. Pressing the F key on a polygon will convert it back to a rectangle using its bounding box. The A key will add a point to a *selected* polygon.

After you are done annotating, `File->Save` will bring up a new menu to name a new file or replace the old one.

## Test image

![](https://github.com/kraemahz/graphite/blob/main/demo.gif)

*When and Why Did Human Brains Decrease in Size? A New Change-Point Analysis and Insights From Brain Evolution in Ants*
2021 DeSilva, Traniello, Claxton and Fannin. (CC BY)
