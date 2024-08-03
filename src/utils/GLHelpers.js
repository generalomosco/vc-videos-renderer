import { calculateWidthFromRatio, calculateHeightFromRatio } from './Common';
export function createShader(gl, type, source) {
	const shader = gl.createShader(type);
	gl.shaderSource(shader, source);
	gl.compileShader(shader);
	const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
	if (!compiled) {
		console.log('shader not compiled!');
		console.log(gl.getShaderInfoLog(shader));
	}
	return shader;
}

export function createProgram(gl, vertexShader, fragmentShader) {
	const program = gl.createProgram();
	gl.attachShader(program, vertexShader);
	gl.attachShader(program, fragmentShader);
	gl.linkProgram(program);
	gl.useProgram(program);
	return program;
}
export function createBuffer(gl, data, type) {
	const buffer = gl.createBuffer();
	gl.bindBuffer(type, buffer);
	gl.bufferData(type, data, gl.STATIC_DRAW);
	return buffer;
}

export function setBufferData(gl, location, buffer) {
	gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
	gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(location);
}

export function createTexture(gl) {
	const texture = gl.createTexture();
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
	return texture;
}
export function createRectVertices(canvas, { x, y, width, height, borderWidth }) {
	let newLeft = x;
	let newTop = y;
	let newWidth = width;
	let newHeight = height;

	if (borderWidth) {
		newLeft -= borderWidth;
		newTop -= borderWidth;
		newWidth += borderWidth * 2;
		newHeight += borderWidth * 2;
	}

	const left = newLeft;
	const right = left + newWidth;
	const top = newTop;
	const bottom = top + newHeight;
	const canvasWidth = canvas.width / window.devicePixelRatio;
	const canvasHeight = canvas.height / window.devicePixelRatio;
	const leftNorm = left / canvasWidth * 2 - 1;
	const rightNorm = right / canvasWidth * 2 - 1;
	const topNorm = 1 - top / canvasHeight * 2;
	const bottomNorm = 1 - bottom / canvasHeight * 2;
	return new Float32Array([leftNorm, topNorm, rightNorm, topNorm, leftNorm, bottomNorm, rightNorm, bottomNorm]);
}
export function calculateVerticesPosition(canvas, { x, y, objectFit, width, height, borderWidth, imageWidth, imageHeight }) {
	if (borderWidth) {
		x += borderWidth;
		y += borderWidth;
		width -= borderWidth * 2;
		height -= borderWidth * 2;
	} else {
		borderWidth = 0;
	}
	if (objectFit === "contain") {
		let newLeft = x;
		let newTop = y;
		let newWidth = width;
		let newHeight = height;

		if (imageWidth > imageHeight && newWidth > newHeight || imageWidth < imageHeight && newWidth > newHeight) {
			newWidth = calculateWidthFromRatio(newHeight, imageWidth + ':' + imageHeight, [borderWidth, borderWidth, borderWidth, borderWidth]);
			newLeft += (width - newWidth) / 2;
		} else {
			newHeight = calculateHeightFromRatio(newWidth, imageWidth + ':' + imageHeight, [borderWidth, borderWidth, borderWidth, borderWidth]);
			newTop += (height - newHeight) / 2;
		}
		const left = newLeft;
		const right = left + newWidth;
		const top = newTop;
		const bottom = top + newHeight;
		const canvasWidth = canvas.width / window.devicePixelRatio;
		const canvasHeight = canvas.height / window.devicePixelRatio;
		const leftNorm = left / canvasWidth * 2 - 1;
		const rightNorm = right / canvasWidth * 2 - 1;
		const topNorm = 1 - top / canvasHeight * 2;
		const bottomNorm = 1 - bottom / canvasHeight * 2;
		return new Float32Array([leftNorm, topNorm, rightNorm, topNorm, leftNorm, bottomNorm, rightNorm, bottomNorm]);
	} else if (objectFit === "cover") {
		let newLeft = x;
		let newTop = y;
		let newWidth = width;
		let newHeight = height;

		if (imageWidth > imageHeight && newWidth > newHeight || imageWidth < imageHeight && newWidth > newHeight) {
			newHeight = calculateHeightFromRatio(newWidth, imageWidth + ':' + imageHeight, [borderWidth, borderWidth, borderWidth, borderWidth]);
			newTop += (height - newHeight) / 2;
		} else {
			newWidth = calculateWidthFromRatio(newHeight, imageWidth + ':' + imageHeight, [borderWidth, borderWidth, borderWidth, borderWidth]);
			newLeft += (width - newWidth) / 2;
		}
		const left = newLeft;
		const right = left + newWidth;
		const top = newTop;
		const bottom = top + newHeight;
		const canvasWidth = canvas.width / window.devicePixelRatio;
		const canvasHeight = canvas.height / window.devicePixelRatio;
		const leftNorm = left / canvasWidth * 2 - 1;
		const rightNorm = right / canvasWidth * 2 - 1;
		const topNorm = 1 - top / canvasHeight * 2;
		const bottomNorm = 1 - bottom / canvasHeight * 2;
		return new Float32Array([leftNorm, topNorm, rightNorm, topNorm, leftNorm, bottomNorm, rightNorm, bottomNorm]);
	} else {
		// objectFit === "stretch"
		const left = x;
		const right = left + width;
		const top = y;
		const bottom = top + height;
		const canvasWidth = canvas.width / window.devicePixelRatio;
		const canvasHeight = canvas.height / window.devicePixelRatio;
		const leftNorm = left / canvasWidth * 2 - 1;
		const rightNorm = right / canvasWidth * 2 - 1;
		const topNorm = 1 - top / canvasHeight * 2;
		const bottomNorm = 1 - bottom / canvasHeight * 2;
		return new Float32Array([leftNorm, topNorm, rightNorm, topNorm, leftNorm, bottomNorm, rightNorm, bottomNorm]);
	}
}
