/// <reference path="../typings/threejs/three.d.ts" />

module Curves {
	export interface HermiteControlPoint {
		position: THREE.Vector2;
		tangent: THREE.Vector2;
	} 
	export class Hermite
	{
		points: HermiteControlPoint[] = [];
		curvePoints: THREE.Vector2[] = [];
		curveTangents: THREE.Vector2[] = [];
        private onChangeCallback: () => void;
		
		addPoint(x: number, y: number, x_t: number, y_t: number) {
			this.points.push({
				position: new THREE.Vector2(x, y),
				tangent: new THREE.Vector2(x_t, y_t)
			});
            
            if (this.onChangeCallback) {
                this.onChangeCallback();
            }
		}
		
        clearPoints() {
            this.points = [];
            this.curvePoints = [];
            this.curveTangents = [];
            
            if (this.onChangeCallback) {
                this.onChangeCallback();
            }
        }
        
		private static clamp(val: number) : number {
			if (val < 0) {
				return 0;
			} else if (val > 1) {
				return 1;
			} else {
				return val;
			}
		}
		
		private static interp(u: number, P0: number, P1: number, PT0: number, PT1: number) {
			var u3 = Math.pow(u, 3);
			var u2 = Math.pow(u, 2);
			
			return (2 * u3 - 3 * u2 + 1) * P0 + (-2 * u3 + 3 * u2) * P1 + (u3 - 2 * u2 + u) * PT0 + (u3 - u2) * PT1;
		}
		
		private static gradient(u: number, P0: number, P1: number, PT0: number, PT1: number) {
			// First derivative of hermite curve function
			var u2 = Math.pow(u, 2);
			return 3 * u2 * (2 * P0 - 2 * P1 + PT0 + PT1) - 2 * u * (3 * P0 - 3 * P1 + 2 * PT0 + PT1) + PT0;
		}
		
		static interpolateSegment(cp0: HermiteControlPoint, cp1: HermiteControlPoint, t: number) {
			var p0 = cp0.position;
			var pT0 = cp0.tangent;
			var p1 = cp1.position;
			var pT1 = cp1.tangent;
			
			t = Hermite.clamp(t);
			
			return new THREE.Vector2(
				Hermite.interp(t, p0.x, p1.x, pT0.x, pT1.x),
				Hermite.interp(t, p0.y, p1.y, pT0.y, pT1.y)
			);
		}
		
		static interpolateTangent(cp0: HermiteControlPoint, cp1: HermiteControlPoint, t: number) {
			var p0 = cp0.position;
			var pT0 = cp0.tangent;
			var p1 = cp1.position;
			var pT1 = cp1.tangent;
			
			t = Hermite.clamp(t);
			
			var gradient = new THREE.Vector2(
				Hermite.gradient(t, p0.x, p1.x, pT0.x, pT1.x),
				Hermite.gradient(t, p0.y, p1.y, pT0.y, pT1.y)
			);
			
			var tangent = new THREE.Vector2(gradient.y, gradient.x * -1);
			return tangent.normalize();
		}
		
		static approxSegmentLength(cp0: HermiteControlPoint, cp1: HermiteControlPoint) : number {
			var points: THREE.Vector2[] = [];
			for (var u = 0; u <= 1; u += 0.1) {
				points.push(Curves.Hermite.interpolateSegment(cp0, cp1, u));
			}
			
			var length = 0;
			for (var i = 0; i < points.length - 1; i++) {
				length += new THREE.Vector2().copy(points[i + 1]).sub(points[i]).length(); 
			}
			
			return length;
		}
		
		private static solveTridiagonalMatrix(a: Float32Array, b: Float32Array, c: Float32Array, d: Float32Array) {
			if (a.length != b.length || a.length != c.length || a.length != d.length) {
				console.error("a, b, c and d must all be equal length");
			}
			
			var n = a.length;
			
			var aDash = 0;
			var bDash = 1;
			
			var cDash = new Float32Array(n);
			cDash[0] = c[0] / b[0];
			for (var i = 1; i < n; i++) {
				cDash[i] = c[i] / (b[i] - cDash[i - 1] * a[i]);
			}
			
			var dDash = new Float32Array(n);
			dDash[0] = d[0] / b[0];
			for (var i = 1; i < n; i++) {
				dDash[i] = (d[i] - dDash[i - 1] * a[i]) / (b[i] - cDash[i - 1] * a[i]);
			}
			
			var x = new Float32Array(n);
			x[n - 1] = dDash[n - 1];
			for (var i = n - 2; i >= 0; i--) {
				x[i] = dDash[i] - cDash[i] * x[i + 1];
			}
			
			return x;
		}
		
		private static generateTangentsClampedEnd1d(points: Float32Array, v0Tangent: number, v1Tangent: number) {
			// TODO: tidy up the unnecessary calculations in here
			
			var n = points.length;
			if (n < 3) {
				// Need three points to be able to interpolate
				return;
			}
			
			// Create [a] array of form [0 1 1 1 1 0] 
			var a = new Float32Array(n);
			a[0] = 0;
            for (var i = 1; i < n - 1; i++) {
                a[i] = 1;
            }
			a[n - 1] = 0;
			
			// Create [b] array of form [1 4 4 4 4 1]
			var b = new Float32Array(n);
			b[0] = 1;
            for (var i = 1; i < n - 1; i++) {
                b[i] = 4;
            }
			b[n - 1] = 1;
			
			// Create [c] array of form [0 1 1 1 1 0]
			var c = new Float32Array(a);
			
			// Create [d] array of form [p0, 3(p2 - p0), 3(p3 - p1), pn]
			var d = new Float32Array(n);
			d[0] = v0Tangent;
			for (var i = 1; i < n - 1; i++) {
				d[i] = 3 * (points[i + 1] - points[i - 1]);
			}
			d[n - 1] = v1Tangent;
			
			return Hermite.solveTridiagonalMatrix(a, b, c, d);
		}
		
		private static generateTangentsNaturalSpline1d(points: Float32Array) : Float32Array {
			// TODO: tidy up the unnecessary calculations in here
			
			var n = points.length;
			if (n < 3) {
				// Need three points to be able to interpolate
				return new Float32Array(0);
			}
			
			// Create [a] array of form [0 1 1 1 1 1] 
			var a = new Float32Array(n);
			a[0] = 0;
            for (var i = 1; i < n ; i++) {
                a[i] = 1;
            }
			
			// Create [b] array of form [2 4 4 4 4 2]
			var b = new Float32Array(n);
			b[0] = 2;
            for (var i = 1; i < n - 1; i++) {
                b[i] = 4;
            }
			b[n - 1] = 2;
			
			// Create [c] array of form [1 1 1 1 1 0]
			var c = new Float32Array(a);
			c[0] = 1;
            c[n - 1] = 0;
			
			// Create [d] array of form [p0, 3(p2 - p0), 3(p3 - p1), pn]
			var d = new Float32Array(n);
			d[0] = 3 * (points[1] - points[0]);
			for (var i = 1; i < n - 1; i++) {
				d[i] = 3 * (points[i + 1] - points[i - 1]);
			}
			d[n - 1] = 3 * (points[n - 1] - points[n - 2]);
			
			return Hermite.solveTridiagonalMatrix(a, b, c, d);
		}	
			
		generateTangentsClampedEnd() {
			// Algorithm from Essential Games and Interactive Applications 2nd Ed. p 446
			
            var x_positions = this.points.map((controlPoint) => controlPoint.position.x);
            var y_positions = this.points.map((controlPoint) => controlPoint.position.y);
			
			var xTangents = Hermite.generateTangentsClampedEnd1d(
				new Float32Array(x_positions),
				this.points[0].tangent.x,
				this.points[this.points.length - 1].tangent.x
			);
			
			var yTangents = Hermite.generateTangentsClampedEnd1d(
				new Float32Array(y_positions),
				this.points[0].tangent.y,
				this.points[this.points.length - 1].tangent.y
			);
			
			for (var i = 0; i < xTangents.length; i++) {
				this.points[i].tangent.set(xTangents[i], yTangents[i]);
			}
		}
		
		generateTangentsNaturalSpline() {
			// Algorithm from Essential Games and Interactive Applications 2nd Ed. p 448
			
            var x_positions = this.points.map((controlPoint) => controlPoint.position.x);
            var y_positions = this.points.map((controlPoint) => controlPoint.position.y);
			
			var xTangents = Hermite.generateTangentsNaturalSpline1d(new Float32Array(x_positions));
			var yTangents = Hermite.generateTangentsNaturalSpline1d(new Float32Array(y_positions));
			
			for (var i = 0; i < xTangents.length; i++) {
				this.points[i].tangent.set(xTangents[i], yTangents[i]);
			}
		}
		
		generateCurve() {
			this.curvePoints = [];
			this.curveTangents = [];
			
			var noOfPoints = this.points.length;
			if (noOfPoints < 2) {
				return;
			}
			
			for (var i = 0; i < noOfPoints - 1; i++) {
				var p0 = this.points[i];
				var p1 = this.points[i + 1];
				for (var u = 0; u <= 1; u += 0.1) {
					this.curvePoints.push(Hermite.interpolateSegment(p0, p1, u));
					this.curveTangents.push(Hermite.interpolateTangent(p0, p1, u));
				}
			}
		}
        
        onChangeHandler(callback: () => void) {
            this.onChangeCallback = callback;
        }
	}
}