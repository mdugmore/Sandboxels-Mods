/*
Prank Pack mod
- Whoopee Cushion: puffs fart gas when stepped on (head/body nearby), then deflates and re-inflates.
- Fart Gas: light, flammable, slowly decays.
- Toilet Clog + Clogged Machines: clogs drains/vents/toilets; Plunger tool unclogs.
- Plunger (tool): unclogs + splashes nearby gross stuff around.
*/

(function () {
	"use strict";

	const MOD_ID = "prank_pack";

	function prankPackInit() {
		// Don't run until the engine globals exist.
		if (typeof elements === "undefined" || typeof behaviors === "undefined") return false;

		// Avoid re-registering if the mod is loaded twice.
		if (elements.whoopee_cushion || elements.fart_gas || elements.plunger) return true;

		// Keep dependencies soft so this mod can be loaded alongside many different mod sets.
		const have = (name) => !!(elements && elements[name]);
		const inBounds = (x, y) => (typeof outOfBounds === "function" ? !outOfBounds(x, y) : true);

	function randInt(min, maxInclusive) {
		return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
	}

	function forSquare(x, y, r, fn) {
		for (let dx = -r; dx <= r; dx++) {
			for (let dy = -r; dy <= r; dy++) {
				const x2 = x + dx;
				const y2 = y + dy;
				if (!inBounds(x2, y2)) continue;
				fn(x2, y2, dx, dy);
			}
		}
	}

	function isEmptySafe(x, y) {
		if (typeof isEmpty !== "function") return true;
		return isEmpty(x, y, true);
	}

	function getPixelSafe(x, y) {
		if (typeof pixelMap === "undefined" || !pixelMap || !pixelMap[x]) return null;
		return pixelMap[x][y] || null;
	}

	function makeFartPuff(x, y, amount, maxLife) {
		if (typeof createPixel !== "function") return;
		const n = (typeof amount === "number") ? amount : randInt(6, 12);
		for (let i = 0; i < n; i++) {
			// Bias upward and slightly to the sides.
			const dx = randInt(-2, 2);
			const dy = -randInt(1, 4);
			const x2 = x + dx;
			const y2 = y + dy;
			if (!inBounds(x2, y2)) continue;
			if (!isEmptySafe(x2, y2)) continue;
			createPixel("fart_gas", x2, y2);
			const p = getPixelSafe(x2, y2);
			if (p) {
				const existingLife = (p.pp_life === undefined) ? 9999 : p.pp_life;
				const capLife = (typeof maxLife === "number") ? maxLife : randInt(120, 220);
				p.pp_life = Math.min(existingLife, capLife);
			}
		}

		// Optional extra stench "pop" if the base element exists.
		if (have("stench") && Math.random() < 0.25) {
			const x3 = x + randInt(-1, 1);
			const y3 = y - 1;
			if (inBounds(x3, y3) && isEmptySafe(x3, y3)) {
				createPixel("stench", x3, y3);
			}
		}
	}

	function maybeIgniteFart(pixel) {
		// If the engine sets pixel.burning, let the normal burn system handle it.
		// This just gives fart gas an extra chance to react with nearby fire.
		if (!pixel || pixel.burning) return;
		if (!have("fire")) return;
		if (Math.random() > 0.06) return;

		forSquare(pixel.x, pixel.y, 1, (x2, y2) => {
			if (isEmptySafe(x2, y2)) return;
			const p = getPixelSafe(x2, y2);
			if (!p) return;
			if (p.element === "fire") {
				pixel.burning = true;
				pixel.burnStart = typeof pixelTicks === "number" ? pixelTicks : 0;
			}
		});
	}

	function tryYeet(pixel, strength) {
		if (!pixel || typeof tryMove !== "function") return false;
		const s = (typeof strength === "number") ? strength : 2;
		for (let i = 0; i < 4; i++) {
			const dx = randInt(-s, s);
			const dy = -randInt(1, s); // mostly upward
			if (dx === 0 && dy === 0) continue;
			if (tryMove(pixel, pixel.x + dx, pixel.y + dy)) return true;
		}
		return false;
	}

	function isGross(elemName) {
		// Keep this list broad; missing elements are fine.
		return [
			"shit",
			"dried_shit",
			"diarrhea",
			"barf",
			"vomit",
			"excrement",
			"dirty_water",
			"stench",
			"fart_gas",
		].includes(elemName);
	}

	// --- Elements ---

	elements.fart_gas = {
		name: "Fart Gas",
		color: ["#b9d66c", "#cbe57a", "#a7c85c", "#d0f08a"],
		behavior: behaviors.GAS,
		category: "gases",
		state: "gas",
		density: 0.35,
		flammable: true,
		burn: 70,
		burnTime: 22,
		burnInto: ["smoke", "smoke", "smoke", "stench"],
		reactions: {},
		tick: function (pixel) {
			if (pixel.pp_life === undefined) pixel.pp_life = randInt(160, 260);
			pixel.pp_life--;
			if (pixel.pp_life <= 0) {
				// Decay into stench or disappear.
				if (have("stench") && Math.random() < 0.5) {
					changePixel(pixel, "stench", true);
				} else {
					deletePixel(pixel.x, pixel.y);
				}
				return;
			}

			// Occasionally refresh stench around it for "gross persistence".
			if (have("stench") && Math.random() < 0.01) {
				const x2 = pixel.x + randInt(-1, 1);
				const y2 = pixel.y + randInt(-1, 1);
				if (inBounds(x2, y2) && isEmptySafe(x2, y2)) {
					createPixel("stench", x2, y2);
				}
			}

			maybeIgniteFart(pixel);
		},
	};

	elements.whoopee_cushion = {
		name: "Whoopee Cushion",
		color: ["#d64545", "#e05656", "#b72f2f"],
		behavior: behaviors.SUPPORT,
		category: "special",
		state: "solid",
		density: 1200,
		hardness: 0.3,
		desc: "Puffs fart gas when a human steps near it. Cooldown: it deflates then re-inflates.",
		tick: function (pixel) {
			// Trigger on nearby head/body (common human parts in Sandboxels).
			let triggered = false;
			forSquare(pixel.x, pixel.y, 1, (x2, y2) => {
				if (triggered) return;
				if (isEmptySafe(x2, y2)) return;
				const p = getPixelSafe(x2, y2);
				if (!p) return;
				if (p.element === "head" || p.element === "body") triggered = true;
			});

			if (!triggered) return;

			makeFartPuff(pixel.x, pixel.y, randInt(8, 16), randInt(120, 200));
			pixel.pp_inflate = randInt(70, 120);
			changePixel(pixel, "deflated_whoopee_cushion", true);
		},
	};

	elements.deflated_whoopee_cushion = {
		name: "Deflated Whoopee Cushion",
		color: ["#8f2b2b", "#a13a3a"],
		behavior: behaviors.SUPPORT,
		category: "special",
		state: "solid",
		density: 1200,
		hardness: 0.3,
		hidden: true,
		tick: function (pixel) {
			if (pixel.pp_inflate === undefined) pixel.pp_inflate = randInt(70, 120);
			pixel.pp_inflate--;
			if (pixel.pp_inflate <= 0) {
				delete pixel.pp_inflate;
				changePixel(pixel, "whoopee_cushion", true);
			}
		},
	};

	elements.toilet_clog = {
		name: "Toilet Clog",
		color: ["#5c3a1b", "#4a2d12", "#6f4a25"],
		behavior: behaviors.POWDER,
		category: "special",
		state: "solid",
		density: 1400,
		stain: 0.25,
		desc: "Clogs drains, vents, and toilets when it touches them. Use Plunger to fix.",
		tick: function (pixel) {
			// Convert nearby machines into clogged variants, then consume the clog pixel.
			let cloggedSomething = false;
			forSquare(pixel.x, pixel.y, 1, (x2, y2) => {
				if (cloggedSomething) return;
				if (isEmptySafe(x2, y2)) return;
				const p = getPixelSafe(x2, y2);
				if (!p) return;
				if (p.element === "drain") {
					changePixel(p, "clogged_drain", true);
					cloggedSomething = true;
				} else if (p.element === "vent") {
					changePixel(p, "clogged_vent", true);
					cloggedSomething = true;
				} else if (p.element === "toilet") {
					changePixel(p, "clogged_toilet", true);
					cloggedSomething = true;
				}
			});

			if (cloggedSomething) {
				// A little celebratory stink.
				makeFartPuff(pixel.x, pixel.y, randInt(2, 5), randInt(80, 140));
				deletePixel(pixel.x, pixel.y);
			}
		},
	};

	// Clogged machine variants (hidden so they don't clutter the menu).
	elements.clogged_drain = {
		name: "Clogged Drain",
		color: "#5b4a4a",
		behavior: behaviors.WALL,
		category: "special",
		state: "solid",
		density: 2000,
		breakInto: have("metal_scrap") ? ["metal_scrap"] : undefined,
		desc: "A drain clogged by a prank. Use Plunger on it.",
		hidden: true,
	};

	elements.clogged_vent = {
		name: "Clogged Vent",
		color: "#6a5a5a",
		behavior: behaviors.WALL,
		category: "special",
		state: "solid",
		density: 2000,
		breakInto: have("metal_scrap") ? ["metal_scrap"] : undefined,
		desc: "A vent clogged by a prank. Use Plunger on it.",
		hidden: true,
	};

	elements.clogged_toilet = {
		name: "Clogged Toilet",
		color: "#d3d5cf",
		behavior: behaviors.WALL,
		category: "machines",
		state: "solid",
		density: 2400,
		breakInto: have("porcelain_shard") ? ["porcelain_shard"] : undefined,
		desc: "A toilet clogged by a prank. Use Plunger on it.",
		hidden: true,
	};

	// Plunger tool (unclogs and splashes nearby grossness).
	elements.plunger = {
		name: "Plunger",
		color: ["#b50000", "#c60000", "#8b5a2b"],
		category: "edit",
		excludeRandom: true,
		cooldown: 2,
		desc: "Unclogs toilets/drains/vents and splashes nearby gross stuff upward.",
		tool: function (pixel) {
			const x = pixel.x;
			const y = pixel.y;

			// Unclog actions.
			if (pixel.element === "toilet_clog") {
				makeFartPuff(x, y, randInt(3, 6), randInt(80, 140));
				deletePixel(x, y);
				return;
			}
			if (pixel.element === "clogged_drain") {
				changePixel(pixel, "drain", true);
				makeFartPuff(x, y, randInt(2, 5), randInt(70, 120));
				return;
			}
			if (pixel.element === "clogged_vent") {
				changePixel(pixel, "vent", true);
				makeFartPuff(x, y, randInt(2, 5), randInt(70, 120));
				return;
			}
			if (pixel.element === "clogged_toilet") {
				changePixel(pixel, "toilet", true);
				makeFartPuff(x, y, randInt(2, 6), randInt(70, 120));
				return;
			}

			// Otherwise: plunge splash. Yeet gross neighbors a bit upward.
			let splashed = 0;
			forSquare(x, y, 2, (x2, y2) => {
				if (isEmptySafe(x2, y2)) return;
				const p = getPixelSafe(x2, y2);
				if (!p) return;
				if (!isGross(p.element)) return;
				if (tryYeet(p, 2)) splashed++;
			});

			if (splashed > 0) {
				makeFartPuff(x, y, Math.min(10, 2 + splashed), randInt(90, 160));
			}
		},
	};

	// Quick compatibility: if the base elements exist, make them "aware" of fart gas a bit.
	// A little extra chaos: water will "dilute" fart gas into stench sometimes.
	if (have("fart_gas") && have("stench") && have("dirty_water")) {
		elements.fart_gas.reactions = elements.fart_gas.reactions || {};
		elements.fart_gas.reactions.water = { elem1: "stench", elem2: "dirty_water", chance: 0.05 };
	}

	if (have("fart_gas") && have("stench")) {
		elements.fart_gas.ignore = elements.fart_gas.ignore || [];
		if (!elements.fart_gas.ignore.includes("stench")) elements.fart_gas.ignore.push("stench");
	}

	// Tag these elements so other mods/tools can recognize them (optional convention).
	for (const k of ["fart_gas", "toilet_clog"]) {
		if (have(k)) {
			if (elements[k].isPrank === undefined) elements[k].isPrank = true;
			if (elements[k].mod === undefined) elements[k].mod = MOD_ID;
		}
	}

	return true;
	}

	// Prefer runAfterLoad when available; otherwise poll until the engine is ready.
	(function schedule() {
		if (typeof runAfterLoad === "function") {
			runAfterLoad(prankPackInit);
			return;
		}
		const root = typeof window !== "undefined" ? window : globalThis;
		const tick = function () {
			if (prankPackInit()) return;
			if (root && typeof root.setTimeout === "function") root.setTimeout(tick, 25);
		};
		tick();
	})();
})();
