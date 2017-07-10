function colorsDistance(c1, c2) {
	return (
		(Math.abs(c1.r - c2.r) +
			Math.abs(c1.g - c2.g) +
			Math.abs(c1.b - c2.b)) /
		3
	);
}

function createCanvas() {
	if (typeof window !== 'undefined') {
		return document.createElement('canvas');
	}


	const Canvas = require('canvas');
	return new Canvas;
}

function createImage() {
	if (typeof window !== 'undefined') {
		return new window.Image();
	}

	const canvas = require('canvas');
	const Image = canvas.Image;
	Image.prototype.setAttribute = function() {};
	return new Image();
}

function loop(w, h, callback) {
	var x, y;

	for (x = 0; x < w; x++) {
		for (y = 0; y < h; y++) {
			callback(x, y);
		}
	}
}

function getBrightness(r, g, b) {
	return 0.3 * r + 0.59 * g + 0.11 * b;
}

function isColorSimilar(a, b, color, tolerance) {
	if (typeof a === 'undefined') {
		return false;
	}
	if (typeof b === 'undefined') {
		return false;
	}

	const absDiff = Math.abs(a - b);

	if (a === b) {
		return true;
	} else if (absDiff < tolerance[color]) {
		return true;
	} else {
		return false;
	}
}

function isContrasting(d1, d2, tolerance) {
	return (
		Math.abs(d1.brightness - d2.brightness) > tolerance.maxBrightness
	);
}

function isRGBSame(d1, d2) {
	var red = d1.r === d2.r;
	var green = d1.g === d2.g;
	var blue = d1.b === d2.b;
	return red && green && blue;
}

function getHue(r, g, b) {
	r = r / 255;
	g = g / 255;
	b = b / 255;
	var max = Math.max(r, g, b),
		min = Math.min(r, g, b);
	var h;
	var d;

	if (max == min) {
		h = 0; // achromatic
	} else {
		d = max - min;
		switch (max) {
			case r:
				h = (g - b) / d + (g < b ? 6 : 0);
				break;
			case g:
				h = (b - r) / d + 2;
				break;
			case b:
				h = (r - g) / d + 4;
				break;
		}
		h /= 6;
	}

	return h;
}

function isPixelBrightnessSimilar(d1, d2, tolerance) {
	var alpha = isColorSimilar(d1.a, d2.a, 'alpha', tolerance);
	var brightness = isColorSimilar(
		d1.brightness,
		d2.brightness,
		'minBrightness',
		tolerance
	);
	return brightness && alpha;
}

function isRGBSimilar(d1, d2, tolerance) {
	var red = isColorSimilar(d1.r, d2.r, 'red', tolerance);
	var green = isColorSimilar(d1.g, d2.g, 'green', tolerance);
	var blue = isColorSimilar(d1.b, d2.b, 'blue', tolerance);
	var alpha = isColorSimilar(d1.a, d2.a, 'alpha', tolerance);

	return red && green && blue && alpha;
}

function copyPixel(px, offset, data, transparency = 1) {
	px[offset] = data.r; //r
	px[offset + 1] = data.g; //g
	px[offset + 2] = data.b; //b
	px[offset + 3] = data.a * transparency; //a
}

function addBrightnessInfo(data) {
	// 'corrected' lightness
	data.brightness = getBrightness(data.r, data.g, data.b);
}

function copyGrayScalePixel(px, offset, data, pixelTransparency) {
	px[offset] = data.brightness; //r
	px[offset + 1] = data.brightness; //g
	px[offset + 2] = data.brightness; //b
	px[offset + 3] = data.a * pixelTransparency; //a
}

function getPixelInfo(dst, data, offset) {
	if (data.length > offset) {
		dst.r = data[offset];
		dst.g = data[offset + 1];
		dst.b = data[offset + 2];
		dst.a = data[offset + 3];

		return true;
	}

	return false;
}

function normalise(img, w, h) {
	if (img.height < h || img.width < w) {
		let c = createCanvas();
		c.width = w;
		c.height = h;
		let context = c.getContext('2d');
		context.putImageData(img, 0, 0);
		return context.getImageData(0, 0, w, h);
	}

	return img;
}

function isAntialiased(sourcePix, target, data, cache, y, x, width, tolerance) {
	let hasHighContrastSibling = 0;
	let hasSiblingWithDifferentHue = 0;
	let hasEquivalentSibling = 0;
	data.h = getHue(data.r, data.g, data.b);

	for (let i = -1; i <= 1; i++) {
		for (let j = -1; j <= 1; j++) {
			if (i !== 0 || j !== 0) {
				const offset = ((y + j) * width + (x + i)) * 4;

				if (!getPixelInfo(target, data, offset)) {
					continue;
				}

				addBrightnessInfo(target);
				target.h = getHue(target.r, target.g, target.b);

				if (isContrasting(sourcePix, target, tolerance)) {
					hasHighContrastSibling++;
				}

				if (isRGBSame(sourcePix, target)) {
					hasEquivalentSibling++;
				}

				if (Math.abs(target.h - sourcePix.h) > 0.3) {
					hasSiblingWithDifferentHue++;
				}

				if (
					hasSiblingWithDifferentHue > 1 ||
					hasHighContrastSibling > 1
				) {
					return true;
				}
			}
		}
	}

	if (hasEquivalentSibling < 2) {
		return true;
	}

	return false;
}

function buffToBase64(buffer) {
	const imageType = require('image-type');
	return 'data:image/' + imageType(buffer) + ';base64,' + buffer.toString('base64');
}

function loadImage(image) {
	const hiddenCanvas = createCanvas();
	const { width, height } = image;
	hiddenCanvas.width = width;
	hiddenCanvas.height = height;
	hiddenCanvas.getContext('2d').drawImage(image, 0, 0, width, height);
	return hiddenCanvas.getContext('2d').getImageData(0, 0, width, height);
}

function executeCallbacks(callbacks, data) {
	for (let i = 0; i < callbacks.length; i++) {
		if (typeof callbacks[i] === 'function') {
			callbacks[i](data);
		}
	}
}

function loadImageData(file) {
	return new Promise((resolve, reject) => {
		var hiddenImage = createImage();

		hiddenImage.onerror = () => {
			hiddenImage.onerror = null; //fixes pollution between calls
			reject({
				error: 'Image load error.'
			});
		};

		hiddenImage.onload = function() {
			hiddenImage.onload = null; //fixes pollution between calls
			resolve(loadImage(hiddenImage));
		};

		if (typeof file === 'string') {
			hiddenImage.src = file;
			if (hiddenImage.complete && hiddenImage.naturalWidth > 0) {
				hiddenImage.onload();
			}
		} else if (file instanceof Buffer) {
			hiddenImage.src = buffToBase64(file);
			hiddenImage.onload();
		}
	});
}

function analyseImages(img1, img2, options) {
	const {
		width,
		height,
		largeImageThreshold,
		ignoreAntialiasing,
		ignoreColors,
		tolerance,
		errorPixelMethod,
		pixelTransparency,
		errorPixelColor,
		generateDiffImage
	} = options;
	let hiddenCanvas = createCanvas();
	const time = Date.now();

	hiddenCanvas.width = width;
	hiddenCanvas.height = height;

	let mismatchCount = 0;
	const context = hiddenCanvas.getContext('2d');
	const imgd = context.createImageData(width, height);
	const targetPix = imgd.data;
	const diffBounds = {
		top: height,
		left: width,
		bottom: 0,
		right: 0
	};

	function updateBounds(x, y) {
		diffBounds.left = Math.min(x, diffBounds.left);
		diffBounds.right = Math.max(x, diffBounds.right);
		diffBounds.top = Math.min(y, diffBounds.top);
		diffBounds.bottom = Math.max(y, diffBounds.bottom);
	}

	let skip;

	if (
		!!largeImageThreshold &&
		ignoreAntialiasing &&
		(width > largeImageThreshold || height > largeImageThreshold)
	) {
		skip = 6;
	}

	const pixel1 = { r: 0, g: 0, b: 0, a: 0 };
	const pixel2 = { r: 0, g: 0, b: 0, a: 0 };

	loop(width, height, function(horizontalPos, verticalPos) {
		if (skip) {
			// only skip if the image isn't small
			if (
				verticalPos % skip === 0 ||
				horizontalPos % skip === 0
			) {
				return;
			}
		}

		const offset = (verticalPos * width + horizontalPos) * 4;

		if (
			!getPixelInfo(pixel1, img1.data, offset) ||
			!getPixelInfo(pixel2, img2.data, offset)
		) {
			return;
		}

		if (ignoreColors) {
			addBrightnessInfo(pixel1);
			addBrightnessInfo(pixel2);

			if (isPixelBrightnessSimilar(pixel1, pixel2, tolerance)) {
				copyGrayScalePixel(targetPix, offset, pixel2, pixelTransparency);
			} else {
				errorPixelMethod(targetPix, offset, pixel1, pixel2, errorPixelColor);
				mismatchCount++;
				updateBounds(horizontalPos, verticalPos);
			}
			return;
		}

		if (isRGBSimilar(pixel1, pixel2, tolerance)) {
			copyPixel(targetPix, offset, pixel1, pixel2);
		} else if (
			ignoreAntialiasing &&
			(
				addBrightnessInfo(pixel1), // jit pixel info augmentation looks a little weird, sorry.
				addBrightnessInfo(pixel2),
				isAntialiased(
					pixel1,
					targetPix,
					img1.data,
					1,
					verticalPos,
					horizontalPos,
					width,
					tolerance
				) ||
					isAntialiased(
						pixel2,
						targetPix,
						img2.data,
						2,
						verticalPos,
						horizontalPos,
						width,
						tolerance
					)
			)
		) {
			if (isPixelBrightnessSimilar(pixel1, pixel2, tolerance)) {
				copyGrayScalePixel(targetPix, offset, pixel2, pixelTransparency);
			} else {
				errorPixelMethod(targetPix, offset, pixel1, pixel2, errorPixelColor);
				mismatchCount++;
				updateBounds(horizontalPos, verticalPos);
			}
		} else {
			errorPixelMethod(targetPix, offset, pixel1, pixel2, errorPixelColor);
			mismatchCount++;
			updateBounds(horizontalPos, verticalPos);
		}
	});

	const result = {
		misMatchPercentage: mismatchCount / (height * width),
		diffBounds: diffBounds,
		analysisTime: Date.now() - time
	};

	if (generateDiffImage) {
		context.putImageData(imgd, 0, 0);
		result.imageDataUri = hiddenCanvas.toDataURL('image/png');
	}

	hiddenCanvas = null;

	return result;
}

function compare(a, b, options) {
	const {
		tolerance,
		ignoreAntialiasing,
		ignoreColors,
		ignoreNothing,
		errorPixelMethod,
		pixelTransparency,
		errorPixelColor,
		generateDiffImage
	} = options;

	return Promise.all([loadImageData(a), loadImageData(b)]).then(images => {
		return new Promise((resolve, reject) => {
			const [first, second] = images;

			if (first.error || second.error) {
				const error = first.error ? first.error : second.error;
				return reject({
					error
				});
			}

			const width = first.width > second.width ? first.width : second.width;
			const height = first.height > second.height ? first.height : second.height;

			const result = analyseImages(
				normalise(first, width, height),
				normalise(second, width, height),
				{
					width,
					height,
					ignoreAntialiasing,
					ignoreColors,
					tolerance,
					errorPixelMethod,
					pixelTransparency,
					errorPixelColor,
					generateDiffImage
				}
			);

			result.isSameDimensions = first.width === second.width && first.height === second.height;

			result.dimensionDifference = {
				width: first.width - second.width,
				height: first.height - second.height
			};

			resolve(result);
		});
	});
}

const DEFAULTS = {
	errorPixelColor: {
		// Color for Error Pixels. Between 0 and 255.
		red: 255,
		green: 0,
		blue: 255,
		alpha: 255
	},
	tolerance: {
		red: 16,
		green: 16,
		blue: 16,
		alpha: 16,
		minBrightness: 16,
		maxBrightness: 240
	},
	targetPix: { r: 0, g: 0, b: 0, a: 0 },
	pixelTransparency: 1,
	largeImageThreshold: 1200,
	ignoreAntialiasing: false,
	ignoreColors: false,
	ignoreNothing: false,
	generateDiffImage: false,
	errorType: 'flat'
};

const errorPixelTransformMethods = {
	flat(px, offset, d1, d2, errorPixelColor) {
		px[offset] = errorPixelColor.red;
		px[offset + 1] = errorPixelColor.green;
		px[offset + 2] = errorPixelColor.blue;
		px[offset + 3] = errorPixelColor.alpha;
	},

	movement(px, offset, d1, d2, errorPixelColor) {
		px[offset] = (d2.r * (errorPixelColor.red / 255) + errorPixelColor.red) / 2;
		px[offset + 1] = (d2.g * (errorPixelColor.green / 255) + errorPixelColor.green) / 2;
		px[offset + 2] = (d2.b * (errorPixelColor.blue / 255) + errorPixelColor.blue) / 2;
		px[offset + 3] = d2.a;
	},

	flatDifferenceIntensity(px, offset, d1, d2,errorPixelColor) {
		px[offset] = errorPixelColor.red;
		px[offset + 1] = errorPixelColor.green;
		px[offset + 2] = errorPixelColor.blue;
		px[offset + 3] = colorsDistance(d1, d2);
	},

	movementDifferenceIntensity(px, offset, d1, d2, errorPixelColor) {
		var ratio = colorsDistance(d1, d2) / 255 * 0.8;

		px[offset] = (1 - ratio) * (d2.r * (errorPixelColor.red / 255)) + ratio * errorPixelColor.red;
		px[offset + 1] = (1 - ratio) * (d2.g * (errorPixelColor.green / 255)) + ratio * errorPixelColor.green;
		px[offset + 2] = (1 - ratio) * (d2.b * (errorPixelColor.blue / 255)) + ratio * errorPixelColor.blue;
		px[offset + 3] = d2.a;
	}
};

function resemble(imageA, imageB, options) {
	let {
		errorPixelColor,
		tolerance,
		largeImageThreshold,
		targetPix,
		pixelTransparency,
		ignoreAntialiasing,
		ignoreColors,
		ignoreNothing,
		generateDiffImage,
		errorType
	} = Object.assign({}, DEFAULTS, options);

	const errorPixelMethod = errorPixelTransformMethods[errorType];

	if (ignoreAntialiasing) {
		tolerance.red = 32;
		tolerance.green = 32;
		tolerance.blue = 32;
		tolerance.alpha = 32;
		tolerance.minBrightness = 64;
		tolerance.maxBrightness = 96;
		ignoreColors = false;
	}

	if (ignoreNothing) {
		tolerance.red = 0;
		tolerance.green = 0;
		tolerance.blue = 0;
		tolerance.alpha = 0;
		tolerance.minBrightness = 0;
		tolerance.maxBrightness = 255;
	}

	if (ignoreColors) {
		tolerance.alpha = 16;
		tolerance.minBrightness = 16;
		tolerance.maxBrightness = 240;
	}

	return compare(imageA, imageB, {
		tolerance,
		ignoreAntialiasing,
		ignoreColors,
		ignoreNothing,
		errorPixelMethod,
		pixelTransparency,
		errorPixelColor,
		generateDiffImage
	});
}

if (typeof window !== 'undefined') {
	window.resemble = resemble;
} else {
	module.exports = resemble;
}
