export function assert(condition: any, msg?: string) {
	if (!condition) {
		throw new Error(msg || "Assertion failed");
	}
}
assert.strictEqual = function (a: any, b: any, msg?: string) {
	if (a !== b) {
		throw new Error(msg || `Assertion failed: ${a} !== ${b}`);
	}
};
