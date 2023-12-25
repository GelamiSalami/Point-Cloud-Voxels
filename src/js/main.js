
import GUI from "./lib/lil-gui.module.min.js";
import Stats from "./lib/stats.module.min.js";
import m4 from "./lib/m4.module.min.js";

import { RenderShader, PointsShader, HoleFillingShader } from "./shaders/ShaderSources.js";

import { Texture, Framebuffer, ShaderProgram,
		 Utils, MouseInput, OrbitControls } from "./lib/toymi.module.min.js";

const sin = Math.sin;
const cos = Math.cos;
const PI = Math.PI;

(async function main() {

function addStatsJS(type = 0, domElement = document.body) {
	const stats = new Stats();

	stats.showPanel(type); // 0: fps, 1: ms, 2: mb, 3+: custom
	domElement.appendChild(stats.dom);

	return stats;
}

const container = document.getElementById("canvas-container");
const canvas = document.getElementById("main-canvas");
const gl = canvas.getContext("webgl2", { antialias: false });

const stats = addStatsJS(0, container);

const mouse = new MouseInput(canvas);

const controls = new OrbitControls(mouse, container);

controls.scrollSensitivity = 6;
controls.pitch = PI / 4;
controls.yaw = PI / 4;

Utils.disableContextMenu(canvas);

const texture = new Texture(gl, {
	width: 2,
	height: 2,
	minFilter: gl.NEAREST,
	magFilter: gl.NEAREST,
	wrapMode: gl.REPEAT,
	data: new Uint8Array([0, 0, 0, 255, 255, 0, 255, 255, 255, 0, 255, 255, 0, 0, 0, 255])
});

if (!gl) {
	console.error("WebGL2 context not available!");
}

if (!gl.getExtension('EXT_color_buffer_float')) {
	console.error('Extension EXT_color_buffer_float not available!');
}

if (!gl.getExtension('OES_texture_float_linear')) {
	console.error('Extension OES_texture_float_linear not available!');
}

const program = new ShaderProgram(gl, RenderShader.vertex, RenderShader.fragment);
const pointsProgram = new ShaderProgram(gl, PointsShader.vertex, PointsShader.fragment);
const holeFillingProgram = new ShaderProgram(gl, HoleFillingShader.vertex, HoleFillingShader.fragment);

const quad = [
	-1.0, -1.0, 0.0, 0.0,
	-1.0,  1.0, 0.0, 1.0,
	 1.0,  1.0, 1.0, 1.0,
	 1.0, -1.0, 1.0, 0.0
];

const quadBuffer = gl.createBuffer();

gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(quad), gl.STATIC_DRAW);

const quadVAO = gl.createVertexArray();

gl.bindVertexArray(quadVAO);

const posAttribLoc = gl.getAttribLocation(program.glProgram, "aPosition");
const uvAttribLoc = gl.getAttribLocation(program.glProgram, "aUv");

gl.vertexAttribPointer(posAttribLoc, 2, gl.FLOAT, false, 16, 0);
gl.enableVertexAttribArray(posAttribLoc);

gl.vertexAttribPointer(uvAttribLoc, 2, gl.FLOAT, false, 16, 8);
gl.enableVertexAttribArray(uvAttribLoc);

const SIZE = 64;
const voxelPositions = [];
const s = 0.35;

for (let y = 0; y < SIZE; y++) {
	for (let z = 0; z < SIZE; z++) {
		for (let x = 0; x < SIZE; x++) {
			// voxelPositions.push(Math.random() * SIZE);
			// voxelPositions.push(Math.random() * SIZE);
			// voxelPositions.push(Math.random() * SIZE);
			const g = sin(x*s)*cos(y*s) + sin(y*s)*cos(z*s) + sin(z*s)*cos(x*s);
			const d = m4.length([x-SIZE/2,y-SIZE/2,z-SIZE/2]);
			if (g < 0.0 || d > SIZE/2)
				continue;
			voxelPositions.push(x);
			voxelPositions.push(y);
			voxelPositions.push(z);
		}
	}
}

controls.origin = [SIZE/2, SIZE/2, SIZE/2];
controls.radius = SIZE * 1.1;

const pointsBuffer = gl.createBuffer();

gl.bindBuffer(gl.ARRAY_BUFFER, pointsBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(voxelPositions), gl.STATIC_DRAW);

const pointsVAO = gl.createVertexArray();

gl.bindVertexArray(pointsVAO);

const pointsPosAttribLoc = gl.getAttribLocation(pointsProgram.glProgram, "aPosition");

gl.vertexAttribPointer(pointsPosAttribLoc, 3, gl.FLOAT, false, 12, 0);
gl.enableVertexAttribArray(pointsPosAttribLoc);

Utils.resizeCanvasToDisplaySize(gl.canvas);
gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

const pointsTexture = [];
const pointsDepth = [];
const pointsFBO = [];
let swap = 0;

for (let i = 0; i < 2; i++) {
	
	pointsTexture.push(new Texture(gl, {
		width: gl.canvas.width,
		height: gl.canvas.height,
		internalformat: gl.RGBA32F,
		format: gl.RGBA,
		type: gl.FLOAT,
		minFilter: gl.NEAREST,
		magFilter: gl.NEAREST
	}));
	pointsDepth.push(new Texture(gl, {
		width: gl.canvas.width,
		height: gl.canvas.height,
		internalformat: gl.DEPTH_COMPONENT32F,
		format: gl.DEPTH_COMPONENT,
		type: gl.FLOAT,
		minFilter: gl.NEAREST,
		magFilter: gl.NEAREST
	}));
	pointsFBO.push(new Framebuffer(gl, pointsTexture[i].width, pointsTexture[i].height,
	{
		texture: pointsTexture[i].glTexture,
		type: gl.COLOR_ATTACHMENT0
	}, {
		texture: pointsDepth[i].glTexture,
		type: gl.DEPTH_ATTACHMENT
	}));
}

const gui = new GUI();

const renderSettings = {
	holeFilling: true,
	stepCount: 5,
	stepSizes: [16, 8, 4, 2, 1]
};

const cameraSettings = {
	fov: 60.0,
	pitch: 0.0,
	yaw: 0.0,
	radius: 1.0
};

const cameraFolder = gui.addFolder("Camera");
const renderFolder = gui.addFolder("Render");

const pitchController = cameraFolder.add(controls, "pitch").name("Pitch");
const yawController = cameraFolder.add(controls, "yaw").name("Yaw");
const radiusController = cameraFolder.add(controls, "radius").name("Radius");

renderFolder.add(renderSettings, "holeFilling").name("Hole Filling");
renderFolder.add(renderSettings, "stepCount", 0, 8, 1).name("Step Count").onChange((value) => {
	renderSettings.stepSizes = [];
	for (let i = 0; i < value; i++) {
		renderSettings.stepSizes.push(1 << (value - i - 1));
	}
});


const NEAR_PLANE = 0.1;
const FAR_PLANE = 1000.0;

let frames = 0;
function render(currentTime) {
	if (Utils.resizeCanvasToDisplaySize(gl.canvas)) {
		for (let i = 0; i < 2; i++) {
			pointsTexture[i].resize(gl.canvas.width, gl.canvas.height);
			pointsDepth[i].resize(gl.canvas.width, gl.canvas.height);
			pointsFBO[i].resize(gl.canvas.width, gl.canvas.height);
		}
	}

	if (mouse.buttonLeft) {
		console.log("Button left press!");
	}

	if (mouse.buttonRight) {
		console.log("Button right press!");
	}

	controls.update();
	pitchController.updateDisplay();
	yawController.updateDisplay();
	radiusController.updateDisplay();

	const invViewMatrix = m4.lookAt(controls.position, controls.origin, [0, 1, 0]);
	const viewMatrix = m4.inverse(invViewMatrix);
	const aspectRatio = gl.canvas.width / gl.canvas.height;

	const projMatrix = m4.perspective(cameraSettings.fov * Math.PI / 180.0, aspectRatio, NEAR_PLANE, FAR_PLANE);
	const viewProjMatrix = m4.multiply(projMatrix, viewMatrix);
	const invViewProjMatrix = m4.multiply(invViewMatrix, m4.inverse(projMatrix));

	pointsFBO[swap].bind();

	gl.enable(gl.DEPTH_TEST);
	gl.clearColor(0, 0, 0, 0);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	pointsProgram.use();
	gl.bindVertexArray(pointsVAO);

	pointsProgram.setUniform("uViewProjMatrix", viewProjMatrix);
	pointsProgram.setUniform("uViewMatrix", viewMatrix);
	pointsProgram.setUniform("uProjMatrix", projMatrix);

	gl.drawArrays(gl.POINTS, 0, voxelPositions.length/3);

	gl.disable(gl.DEPTH_TEST);

	if (renderSettings.holeFilling && renderSettings.stepCount > 0) {
		for (let i = 0; i < renderSettings.stepSizes.length; i++) {
			swap = 1 - swap;
			pointsFBO[swap].bind();

			holeFillingProgram.use();
			gl.bindVertexArray(quadVAO);

			holeFillingProgram.setUniform("uInvViewProjMatrix", invViewProjMatrix);
			holeFillingProgram.setUniform("uCameraPosition", controls.position);
			holeFillingProgram.setUniform("uOffset", renderSettings.stepSizes[i]);

			pointsTexture[1 - swap].bind();

			gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
		}
	}

	gl.bindFramebuffer(gl.FRAMEBUFFER, null);
	gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

	program.use();
	gl.bindVertexArray(quadVAO);

	program.setUniform("uResolution", [gl.canvas.width, gl.canvas.height]);
	program.setUniform("uFrame", frames);
	program.setUniform("uVolumeSize", [SIZE, SIZE, SIZE]);
	pointsTexture[swap].bind(0);

	gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);

	swap = 1 - swap;
	frames++;

	stats.update();

	requestAnimationFrame(render);
}

requestAnimationFrame(render);

})();