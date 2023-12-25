
const vertex = `#version 300 es
in vec4 aPosition;

out vec3 vPosition;

uniform mat4 uViewProjMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjMatrix;

void main() {
	gl_PointSize = 1.0;
	gl_Position = uViewProjMatrix * aPosition;
	// gl_Position.z = 0.0;
	vPosition = aPosition.xyz;
}
`;

const fragment = `#version 300 es
precision highp float;

in vec3 vPosition;

out vec4 fragColor;

void main() {
	fragColor = vec4(vPosition, 1);
}
`;

export default { vertex, fragment };

