# Representing bitmap images

## Today we are learning
- describe what a pixel is and how pixels make a bitmap image
- describe colour depth and image resolution
- say what metadata is, and give an example for an image

> 🧑‍🏫 Read the four "I can…" aloud. Vocabulary: bitmap · pixel · colour depth · image resolution · metadata. Hand out both worksheets.

## Starter — quick questions
A photo is made of tiny squares. What is each square called? How many bits are in a byte?

> 🧑‍🏫 Answers: each square is a pixel; 8 bits in a byte. This links back to text/file size last lesson.

## What is a pixel?  (I do)
- A bitmap image is a grid of tiny squares.
- Each square is one pixel — a single point of colour.
- The whole picture is built from these pixels.

> 🧑‍🏫 Zoom into any photo until the squares appear. Plain line: "a bitmap is a grid of coloured squares". Image gap: a clean zoomed-in pixel-grid raster is wanted here.

## Colour depth  (we do)
- Colour depth = the number of bits used for each pixel.
- More bits → more colours. The rule is 2 to the power of the number of bits.
- 1 bit = 2 colours · 2 bits = 4 · 3 bits = 8 · 8 bits = 256.

![A colour photo of two puppies]({{res:l10-colour-depth-original.png}})

![The same photo at 1 bit per pixel]({{res:l10-colour-depth-1bit.png}})

> 🧑‍🏫 Show the two puppy images: same photo, fewer bits = fewer colours = lower quality. Likely error: confusing colour depth with resolution — fix-words "depth = colours, resolution = number of pixels".

## Image resolution  (you do)
- Resolution = how many pixels the image has (width × height), or pixels per inch (ppi) when printed.
- Physical size = pixels ÷ ppi. 300 × 300 at 100 ppi → 3 × 3 inches.
- More pixels and more colours = better quality, but a bigger file.

> 🧑‍🏫 Pairs do the colour-depth sort and the fill-in-the-blank. Challenge does the ppi calculation.

## Metadata
- Metadata = data about the data.
- For a photo: width, height, colour depth, date taken, location, camera settings.
- It lets the image be saved and reopened correctly.

> 🧑‍🏫 Plain line: "metadata is extra information stored with the file". Each pupil names one piece of image metadata.

## I can…
Tick your four "I can…". Tell me one piece of metadata stored with a photo.

> 🧑‍🏫 Note who can explain colour depth vs resolution.
