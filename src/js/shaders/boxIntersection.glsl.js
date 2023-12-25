
const boxIntersection = `

// https://www.iquilezles.org/www/articles/intersectors/intersectors.htm
vec2 boxIntersection(vec3 rayOrig, vec3 invRayDir, vec3 signRayDir, vec3 boxOffset, out vec3 outNormal) {
	vec3 m = invRayDir;
	vec3 n = m * rayOrig;
	vec3 k = boxOffset;
	vec3 t1 = -n - k;
	vec3 t2 = -n + k;
	float tN = max( max( t1.x, t1.y ), t1.z );
	float tF = min( min( t2.x, t2.y ), t2.z );
	if(tN > tF || tF < 0.0) {
		return vec2(MAX_DIST);
	}
	outNormal = signRayDir * step(vec3(tN), t1);

	return vec2( tN, tF );
}
`;

export { boxIntersection };