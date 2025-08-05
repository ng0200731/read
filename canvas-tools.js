// Canvas Drawing and Interaction Tools
window.CanvasTools = {
    isDrawing: false,
    startPoint: null,
    currentShape: null,
    polygonPoints: [],

    // Main drawing function for all shapes
    drawShapes(ctx, shapes) {
        shapes.forEach((shape, index) => {
            this.drawShape(ctx, shape, index + 1);
        });
    },

    drawShape(ctx, shape, shapeNumber = null) {
        ctx.save();

        // Set vibrant colors based on shape type
        const colors = {
            'rectangle': { stroke: '#ff6b6b', fill: 'rgba(255, 107, 107, 0.15)' },
            'circle': { stroke: '#4ecdc4', fill: 'rgba(78, 205, 196, 0.15)' },
            'polygon': { stroke: '#45b7d1', fill: 'rgba(69, 183, 209, 0.15)' },
            'detected-contour': { stroke: '#f9ca24', fill: 'rgba(249, 202, 36, 0.15)' }
        };

        const shapeColors = colors[shape.type] || { stroke: '#cccccc', fill: 'rgba(204, 204, 204, 0.15)' };

        ctx.strokeStyle = shape.color || shapeColors.stroke;
        ctx.fillStyle = shape.fillColor || shapeColors.fill;
        ctx.lineWidth = shape.lineWidth || 2;

        switch (shape.type) {
            case 'rectangle':
                this.drawRectangle(ctx, shape);
                break;
            case 'circle':
                this.drawCircle(ctx, shape);
                break;
            case 'polygon':
                this.drawPolygon(ctx, shape);
                break;
            case 'detected-contour':
                this.drawContour(ctx, shape);
                break;
        }

        // Draw number label if provided
        if (shapeNumber !== null) {
            this.drawShapeNumber(ctx, shape, shapeNumber, shapeColors.stroke);
        }

        ctx.restore();
    },

    drawRectangle(ctx, shape) {
        const width = shape.width;
        const height = shape.height;
        
        ctx.beginPath();
        ctx.rect(shape.x, shape.y, width, height);
        ctx.fill();
        ctx.stroke();
        
        // Draw corner handles
        this.drawHandles(ctx, [
            { x: shape.x, y: shape.y },
            { x: shape.x + width, y: shape.y },
            { x: shape.x + width, y: shape.y + height },
            { x: shape.x, y: shape.y + height }
        ]);
    },

    drawCircle(ctx, shape) {
        ctx.beginPath();
        ctx.arc(shape.centerX, shape.centerY, shape.radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();
        
        // Draw center point and radius handle
        ctx.fillStyle = '#667eea';
        ctx.beginPath();
        ctx.arc(shape.centerX, shape.centerY, 3, 0, 2 * Math.PI);
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(shape.centerX + shape.radius, shape.centerY, 3, 0, 2 * Math.PI);
        ctx.fill();
    },

    drawPolygon(ctx, shape) {
        if (shape.points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        
        for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        
        if (shape.closed) {
            ctx.closePath();
            ctx.fill();
        }
        ctx.stroke();
        
        // Draw point handles
        this.drawHandles(ctx, shape.points);
    },

    drawContour(ctx, shape) {
        if (shape.points.length < 2) return;

        ctx.beginPath();
        ctx.moveTo(shape.points[0].x, shape.points[0].y);
        
        for (let i = 1; i < shape.points.length; i++) {
            ctx.lineTo(shape.points[i].x, shape.points[i].y);
        }
        
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
    },

    drawHandles(ctx, points) {
        ctx.fillStyle = '#667eea';
        points.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    },

    drawShapeNumber(ctx, shape, number, strokeColor) {
        // Calculate the position for the number label
        let labelX, labelY;

        switch (shape.type) {
            case 'rectangle':
                // Position at top-left corner with offset
                labelX = shape.x - 25;
                labelY = shape.y - 5;
                break;
            case 'circle':
                // Position at top of circle
                labelX = shape.centerX - 15;
                labelY = shape.centerY - shape.radius - 15;
                break;
            case 'polygon':
            case 'detected-contour':
                // Position at the topmost point
                if (shape.points && shape.points.length > 0) {
                    const topPoint = shape.points.reduce((top, point) =>
                        point.y < top.y ? point : top, shape.points[0]);
                    labelX = topPoint.x - 15;
                    labelY = topPoint.y - 15;
                } else {
                    labelX = 0;
                    labelY = 0;
                }
                break;
            default:
                labelX = 0;
                labelY = 0;
        }

        // Draw number background circle
        ctx.save();
        ctx.fillStyle = strokeColor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;

        const radius = 12;
        ctx.beginPath();
        ctx.arc(labelX, labelY, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Draw number text
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(number.toString(), labelX, labelY);

        ctx.restore();
    },

    // Mouse event handlers
    handleMouseDown(x, y, tool, app) {
        this.isDrawing = true;
        this.startPoint = { x, y };

        switch (tool) {
            case 'rectangle':
                this.startRectangle(x, y);
                break;
            case 'circle':
                this.startCircle(x, y);
                break;
            case 'polygon':
                this.addPolygonPoint(x, y, app);
                break;
        }
    },

    handleMouseMove(x, y, tool, app) {
        if (!this.isDrawing && tool !== 'polygon') return;

        switch (tool) {
            case 'rectangle':
                this.updateRectangle(x, y, app);
                break;
            case 'circle':
                this.updateCircle(x, y, app);
                break;
        }
    },

    handleMouseUp(tool, app) {
        if (tool !== 'polygon') {
            this.isDrawing = false;
            this.finishShape(tool, app);
        }
    },

    // Rectangle tool
    startRectangle(x, y) {
        this.currentShape = {
            type: 'rectangle',
            x: x,
            y: y,
            width: 0,
            height: 0
        };
    },

    updateRectangle(x, y, app) {
        if (!this.currentShape) return;

        this.currentShape.width = x - this.startPoint.x;
        this.currentShape.height = y - this.startPoint.y;
        
        // Handle negative dimensions
        if (this.currentShape.width < 0) {
            this.currentShape.x = x;
            this.currentShape.width = Math.abs(this.currentShape.width);
        } else {
            this.currentShape.x = this.startPoint.x;
        }
        
        if (this.currentShape.height < 0) {
            this.currentShape.y = y;
            this.currentShape.height = Math.abs(this.currentShape.height);
        } else {
            this.currentShape.y = this.startPoint.y;
        }

        app.drawImage();
        this.drawShape(app.ctx, this.currentShape);
    },

    // Circle tool
    startCircle(x, y) {
        this.currentShape = {
            type: 'circle',
            centerX: x,
            centerY: y,
            radius: 0
        };
    },

    updateCircle(x, y, app) {
        if (!this.currentShape) return;

        const dx = x - this.currentShape.centerX;
        const dy = y - this.currentShape.centerY;
        this.currentShape.radius = Math.sqrt(dx * dx + dy * dy);

        app.drawImage();
        this.drawShape(app.ctx, this.currentShape);
    },

    // Polygon tool
    addPolygonPoint(x, y, app) {
        if (!this.currentShape) {
            this.currentShape = {
                type: 'polygon',
                points: [],
                closed: false
            };
            this.polygonPoints = [];
        }

        // Check if clicking near the first point to close polygon
        if (this.polygonPoints.length > 2) {
            const firstPoint = this.polygonPoints[0];
            const distance = Math.sqrt(Math.pow(x - firstPoint.x, 2) + Math.pow(y - firstPoint.y, 2));
            
            if (distance < 10) {
                this.currentShape.closed = true;
                this.currentShape.points = [...this.polygonPoints];
                app.shapes.push(this.currentShape);
                this.currentShape = null;
                this.polygonPoints = [];
                app.drawImage();
                app.updateResults();
                return;
            }
        }

        this.polygonPoints.push({ x, y });
        this.currentShape.points = [...this.polygonPoints];

        app.drawImage();
        this.drawShape(app.ctx, this.currentShape);
    },

    finishShape(tool, app) {
        if (!this.currentShape) return;

        // Only add valid shapes
        if (tool === 'rectangle' && (this.currentShape.width > 5 && this.currentShape.height > 5)) {
            app.shapes.push(this.currentShape);
        } else if (tool === 'circle' && this.currentShape.radius > 5) {
            app.shapes.push(this.currentShape);
        }

        this.currentShape = null;
        app.drawImage();
        app.updateResults();
    },

    // Shape selection and editing
    getShapeAtPoint(x, y, shapes) {
        for (let i = shapes.length - 1; i >= 0; i--) {
            if (this.isPointInShape(x, y, shapes[i])) {
                return { shape: shapes[i], index: i };
            }
        }
        return null;
    },

    isPointInShape(x, y, shape) {
        switch (shape.type) {
            case 'rectangle':
                return x >= shape.x && x <= shape.x + shape.width &&
                       y >= shape.y && y <= shape.y + shape.height;
            
            case 'circle':
                const dx = x - shape.centerX;
                const dy = y - shape.centerY;
                return Math.sqrt(dx * dx + dy * dy) <= shape.radius;
            
            case 'polygon':
                return this.isPointInPolygon(x, y, shape.points);
            
            default:
                return false;
        }
    },

    isPointInPolygon(x, y, points) {
        let inside = false;
        for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
            if (((points[i].y > y) !== (points[j].y > y)) &&
                (x < (points[j].x - points[i].x) * (y - points[i].y) / (points[j].y - points[i].y) + points[i].x)) {
                inside = !inside;
            }
        }
        return inside;
    },

    // Shape manipulation
    moveShape(shape, deltaX, deltaY) {
        switch (shape.type) {
            case 'rectangle':
                shape.x += deltaX;
                shape.y += deltaY;
                break;
            
            case 'circle':
                shape.centerX += deltaX;
                shape.centerY += deltaY;
                break;
            
            case 'polygon':
                shape.points.forEach(point => {
                    point.x += deltaX;
                    point.y += deltaY;
                });
                break;
        }
    },

    resizeShape(shape, handleIndex, newX, newY) {
        switch (shape.type) {
            case 'rectangle':
                this.resizeRectangle(shape, handleIndex, newX, newY);
                break;
            
            case 'circle':
                const dx = newX - shape.centerX;
                const dy = newY - shape.centerY;
                shape.radius = Math.sqrt(dx * dx + dy * dy);
                break;
            
            case 'polygon':
                if (handleIndex < shape.points.length) {
                    shape.points[handleIndex].x = newX;
                    shape.points[handleIndex].y = newY;
                }
                break;
        }
    },

    resizeRectangle(shape, handleIndex, newX, newY) {
        switch (handleIndex) {
            case 0: // Top-left
                shape.width += shape.x - newX;
                shape.height += shape.y - newY;
                shape.x = newX;
                shape.y = newY;
                break;
            case 1: // Top-right
                shape.width = newX - shape.x;
                shape.height += shape.y - newY;
                shape.y = newY;
                break;
            case 2: // Bottom-right
                shape.width = newX - shape.x;
                shape.height = newY - shape.y;
                break;
            case 3: // Bottom-left
                shape.width += shape.x - newX;
                shape.height = newY - shape.y;
                shape.x = newX;
                break;
        }
    },

    // Utility functions
    getShapeHandles(shape) {
        switch (shape.type) {
            case 'rectangle':
                return [
                    { x: shape.x, y: shape.y },
                    { x: shape.x + shape.width, y: shape.y },
                    { x: shape.x + shape.width, y: shape.y + shape.height },
                    { x: shape.x, y: shape.y + shape.height }
                ];
            
            case 'circle':
                return [
                    { x: shape.centerX, y: shape.centerY },
                    { x: shape.centerX + shape.radius, y: shape.centerY }
                ];
            
            case 'polygon':
                return shape.points;
            
            default:
                return [];
        }
    },

    getHandleAtPoint(x, y, shape, tolerance = 8) {
        const handles = this.getShapeHandles(shape);
        for (let i = 0; i < handles.length; i++) {
            const handle = handles[i];
            const distance = Math.sqrt(Math.pow(x - handle.x, 2) + Math.pow(y - handle.y, 2));
            if (distance <= tolerance) {
                return i;
            }
        }
        return -1;
    }
};
