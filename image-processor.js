// Image Processing and Shape Detection
window.ImageProcessor = {
    
    // Main shape detection function
    detectShapes(image, scale) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Process the image to find shapes
        const edges = this.detectEdges(imageData);
        const contours = this.findContours(edges);
        const shapes = this.analyzeContours(contours);
        
        return shapes;
    },

    // Edge detection using a simplified Canny-like algorithm
    detectEdges(imageData) {
        const width = imageData.width;
        const height = imageData.height;
        const data = imageData.data;
        
        // Convert to grayscale
        const gray = new Uint8Array(width * height);
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            gray[i / 4] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        }
        
        // Apply Gaussian blur
        const blurred = this.gaussianBlur(gray, width, height);
        
        // Calculate gradients
        const edges = this.sobelOperator(blurred, width, height);
        
        // Apply threshold
        const threshold = 50;
        for (let i = 0; i < edges.length; i++) {
            edges[i] = edges[i] > threshold ? 255 : 0;
        }
        
        return { data: edges, width, height };
    },

    gaussianBlur(data, width, height) {
        const kernel = [
            [1, 2, 1],
            [2, 4, 2],
            [1, 2, 1]
        ];
        const kernelSum = 16;
        
        const result = new Uint8Array(width * height);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let sum = 0;
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixel = data[(y + ky) * width + (x + kx)];
                        sum += pixel * kernel[ky + 1][kx + 1];
                    }
                }
                result[y * width + x] = sum / kernelSum;
            }
        }
        
        return result;
    },

    sobelOperator(data, width, height) {
        const sobelX = [
            [-1, 0, 1],
            [-2, 0, 2],
            [-1, 0, 1]
        ];
        
        const sobelY = [
            [-1, -2, -1],
            [0, 0, 0],
            [1, 2, 1]
        ];
        
        const result = new Uint8Array(width * height);
        
        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let gx = 0, gy = 0;
                
                for (let ky = -1; ky <= 1; ky++) {
                    for (let kx = -1; kx <= 1; kx++) {
                        const pixel = data[(y + ky) * width + (x + kx)];
                        gx += pixel * sobelX[ky + 1][kx + 1];
                        gy += pixel * sobelY[ky + 1][kx + 1];
                    }
                }
                
                const magnitude = Math.sqrt(gx * gx + gy * gy);
                result[y * width + x] = Math.min(255, magnitude);
            }
        }
        
        return result;
    },

    // Find contours in edge-detected image
    findContours(edges) {
        const width = edges.width;
        const height = edges.height;
        const data = edges.data;
        const visited = new Array(width * height).fill(false);
        const contours = [];
        
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const index = y * width + x;
                if (data[index] === 255 && !visited[index]) {
                    const contour = this.traceContour(data, width, height, x, y, visited);
                    if (contour.length > 10) { // Filter out noise
                        contours.push(contour);
                    }
                }
            }
        }
        
        return contours;
    },

    traceContour(data, width, height, startX, startY, visited) {
        const contour = [];
        const stack = [{ x: startX, y: startY }];
        
        while (stack.length > 0) {
            const { x, y } = stack.pop();
            const index = y * width + x;
            
            if (x < 0 || x >= width || y < 0 || y >= height || 
                visited[index] || data[index] !== 255) {
                continue;
            }
            
            visited[index] = true;
            contour.push({ x, y });
            
            // Check 8-connected neighbors
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 && dy === 0) continue;
                    stack.push({ x: x + dx, y: y + dy });
                }
            }
        }
        
        return contour;
    },

    // Analyze contours to identify shapes
    analyzeContours(contours) {
        const shapes = [];
        
        contours.forEach(contour => {
            if (contour.length < 10) return; // Skip small contours
            
            // Simplify contour
            const simplified = this.simplifyContour(contour);
            
            // Try to identify shape type
            const shapeType = this.identifyShapeType(simplified);
            
            if (shapeType) {
                shapes.push({
                    type: 'detected-contour',
                    subType: shapeType.type,
                    points: simplified,
                    properties: shapeType.properties,
                    color: '#ff6b6b',
                    fillColor: 'rgba(255, 107, 107, 0.2)'
                });
            }
        });
        
        return shapes;
    },

    // Simplify contour using Douglas-Peucker algorithm
    simplifyContour(contour, epsilon = 2) {
        if (contour.length <= 2) return contour;
        
        return this.douglasPeucker(contour, epsilon);
    },

    douglasPeucker(points, epsilon) {
        if (points.length <= 2) return points;
        
        // Find the point with maximum distance from line between first and last points
        let maxDistance = 0;
        let maxIndex = 0;
        
        const start = points[0];
        const end = points[points.length - 1];
        
        for (let i = 1; i < points.length - 1; i++) {
            const distance = this.pointToLineDistance(points[i], start, end);
            if (distance > maxDistance) {
                maxDistance = distance;
                maxIndex = i;
            }
        }
        
        if (maxDistance > epsilon) {
            // Recursive call
            const left = this.douglasPeucker(points.slice(0, maxIndex + 1), epsilon);
            const right = this.douglasPeucker(points.slice(maxIndex), epsilon);
            
            return left.slice(0, -1).concat(right);
        } else {
            return [start, end];
        }
    },

    pointToLineDistance(point, lineStart, lineEnd) {
        const A = lineEnd.y - lineStart.y;
        const B = lineStart.x - lineEnd.x;
        const C = lineEnd.x * lineStart.y - lineStart.x * lineEnd.y;
        
        return Math.abs(A * point.x + B * point.y + C) / Math.sqrt(A * A + B * B);
    },

    // Identify shape type from simplified contour
    identifyShapeType(points) {
        if (points.length < 3) return null;
        
        // Check for rectangle
        if (points.length === 4 || points.length === 5) {
            const rect = this.checkRectangle(points);
            if (rect) return rect;
        }
        
        // Check for circle
        const circle = this.checkCircle(points);
        if (circle) return circle;
        
        // Check for triangle
        if (points.length === 3 || points.length === 4) {
            const triangle = this.checkTriangle(points);
            if (triangle) return triangle;
        }
        
        // Default to polygon
        return {
            type: 'polygon',
            properties: {
                vertices: points.length,
                area: this.calculatePolygonArea(points)
            }
        };
    },

    checkRectangle(points) {
        if (points.length < 4) return null;
        
        // Take first 4 points if more than 4
        const corners = points.slice(0, 4);
        
        // Calculate angles between consecutive sides
        const angles = [];
        for (let i = 0; i < 4; i++) {
            const p1 = corners[i];
            const p2 = corners[(i + 1) % 4];
            const p3 = corners[(i + 2) % 4];
            
            const angle = this.calculateAngle(p1, p2, p3);
            angles.push(angle);
        }
        
        // Check if all angles are approximately 90 degrees
        const rightAngleTolerance = 15; // degrees
        const isRectangle = angles.every(angle => 
            Math.abs(angle - 90) < rightAngleTolerance
        );
        
        if (isRectangle) {
            const bounds = this.getBoundingBox(corners);
            return {
                type: 'rectangle',
                properties: {
                    x: bounds.minX,
                    y: bounds.minY,
                    width: bounds.maxX - bounds.minX,
                    height: bounds.maxY - bounds.minY
                }
            };
        }
        
        return null;
    },

    checkCircle(points) {
        if (points.length < 8) return null;
        
        // Find center and radius
        const center = this.calculateCentroid(points);
        const distances = points.map(p => 
            Math.sqrt(Math.pow(p.x - center.x, 2) + Math.pow(p.y - center.y, 2))
        );
        
        const avgRadius = distances.reduce((sum, d) => sum + d, 0) / distances.length;
        const variance = distances.reduce((sum, d) => sum + Math.pow(d - avgRadius, 2), 0) / distances.length;
        const stdDev = Math.sqrt(variance);
        
        // Check if points are roughly equidistant from center
        const circularityThreshold = avgRadius * 0.15;
        if (stdDev < circularityThreshold) {
            return {
                type: 'circle',
                properties: {
                    centerX: center.x,
                    centerY: center.y,
                    radius: avgRadius
                }
            };
        }
        
        return null;
    },

    checkTriangle(points) {
        if (points.length !== 3 && points.length !== 4) return null;
        
        const vertices = points.length === 4 ? points.slice(0, 3) : points;
        
        return {
            type: 'triangle',
            properties: {
                vertices: vertices,
                area: this.calculateTriangleArea(vertices)
            }
        };
    },

    // Utility functions
    calculateAngle(p1, p2, p3) {
        const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
        const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
        
        const dot = v1.x * v2.x + v1.y * v2.y;
        const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
        const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
        
        const cos = dot / (mag1 * mag2);
        const angle = Math.acos(Math.max(-1, Math.min(1, cos))) * 180 / Math.PI;
        
        return angle;
    },

    calculateCentroid(points) {
        const sum = points.reduce((acc, p) => ({
            x: acc.x + p.x,
            y: acc.y + p.y
        }), { x: 0, y: 0 });
        
        return {
            x: sum.x / points.length,
            y: sum.y / points.length
        };
    },

    getBoundingBox(points) {
        const xs = points.map(p => p.x);
        const ys = points.map(p => p.y);
        
        return {
            minX: Math.min(...xs),
            maxX: Math.max(...xs),
            minY: Math.min(...ys),
            maxY: Math.max(...ys)
        };
    },

    calculatePolygonArea(points) {
        if (points.length < 3) return 0;
        
        let area = 0;
        for (let i = 0; i < points.length; i++) {
            const j = (i + 1) % points.length;
            area += points[i].x * points[j].y;
            area -= points[j].x * points[i].y;
        }
        return Math.abs(area) / 2;
    },

    calculateTriangleArea(vertices) {
        if (vertices.length !== 3) return 0;
        
        const [a, b, c] = vertices;
        return Math.abs((a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)) / 2);
    }
};
