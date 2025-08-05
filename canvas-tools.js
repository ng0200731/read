// Canvas Drawing and Interaction Tools
window.CanvasTools = {
    isDrawing: false,
    startPoint: null,
    currentShape: null,
    polygonPoints: [],

    // Main drawing function for all shapes
    drawShapes(ctx, shapes, zoom = 1, panX = 0, panY = 0, imageInfo = null) {
        shapes.forEach((shape, index) => {
            this.drawShape(ctx, shape, index + 1, zoom, panX, panY, imageInfo);
        });
    },

    // Draw shapes without dimensions (for left canvas)
    drawShapesWithoutDimensions(ctx, shapes, zoom = 1, panX = 0, panY = 0, imageInfo = null) {
        shapes.forEach((shape, index) => {
            this.drawShapeWithoutDimensions(ctx, shape, index + 1, zoom, panX, panY, imageInfo);
        });
    },

    // Draw shapes with dimensions (for right canvas)
    drawShapesWithDimensions(ctx, shapes, zoom = 1, panX = 0, panY = 0, imageInfo = null) {
        shapes.forEach((shape, index) => {
            this.drawShapeWithDimensions(ctx, shape, index + 1, zoom, panX, panY, imageInfo);
        });
    },

    drawShape(ctx, shape, shapeNumber = null, zoom = 1, panX = 0, panY = 0, imageInfo = null) {
        ctx.save();

        // Transform coordinates to match zoomed and panned image
        const transformedShape = this.transformShapeCoordinates(shape, zoom, panX, panY, imageInfo);

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
        // Scale line width with zoom for better visibility
        ctx.lineWidth = (shape.lineWidth || 2) * zoom;

        switch (transformedShape.type) {
            case 'rectangle':
                this.drawRectangle(ctx, transformedShape);
                break;
            case 'circle':
                this.drawCircle(ctx, transformedShape);
                break;
            case 'polygon':
                this.drawPolygon(ctx, transformedShape);
                break;
            case 'detected-contour':
                this.drawContour(ctx, transformedShape);
                break;
        }

        // Draw number label if provided
        if (shapeNumber !== null) {
            this.drawShapeNumber(ctx, transformedShape, shapeNumber, shapeColors.stroke, zoom);
        }

        ctx.restore();
    },

    // Draw shape without dimensions (for left canvas)
    drawShapeWithoutDimensions(ctx, shape, shapeNumber = null, zoom = 1, panX = 0, panY = 0, imageInfo = null) {
        ctx.save();

        // Transform coordinates to match zoomed and panned image
        const transformedShape = this.transformShapeCoordinates(shape, zoom, panX, panY, imageInfo);

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
        // Scale line width with zoom for better visibility
        ctx.lineWidth = (shape.lineWidth || 2) * zoom;

        switch (transformedShape.type) {
            case 'rectangle':
                this.drawRectangleWithoutDimensions(ctx, transformedShape);
                break;
            case 'circle':
                this.drawCircle(ctx, transformedShape);
                break;
            case 'polygon':
                this.drawPolygon(ctx, transformedShape);
                break;
            case 'detected-contour':
                this.drawContour(ctx, transformedShape);
                break;
        }

        // Draw number label if provided
        if (shapeNumber !== null) {
            this.drawShapeNumber(ctx, transformedShape, shapeNumber, shapeColors.stroke, zoom);
        }

        ctx.restore();
    },

    // Draw shape with dimensions (for right canvas)
    drawShapeWithDimensions(ctx, shape, shapeNumber = null, zoom = 1, panX = 0, panY = 0, imageInfo = null) {
        ctx.save();

        // Transform coordinates to match zoomed and panned image
        const transformedShape = this.transformShapeCoordinates(shape, zoom, panX, panY, imageInfo);

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
        // Scale line width with zoom for better visibility
        ctx.lineWidth = (shape.lineWidth || 2) * zoom;

        switch (transformedShape.type) {
            case 'rectangle':
                this.drawRectangle(ctx, transformedShape); // This includes dimensions
                break;
            case 'circle':
                this.drawCircle(ctx, transformedShape);
                break;
            case 'polygon':
                this.drawPolygon(ctx, transformedShape);
                break;
            case 'detected-contour':
                this.drawContour(ctx, transformedShape);
                break;
        }

        // Draw number label if provided
        if (shapeNumber !== null) {
            this.drawShapeNumber(ctx, transformedShape, shapeNumber, shapeColors.stroke, zoom);
        }

        ctx.restore();
    },

    // Transform shape coordinates to match zoomed and panned image
    transformShapeCoordinates(shape, zoom, panX, panY, imageInfo) {
        if (!imageInfo) return shape; // No transformation if no image info

        const transformedShape = { ...shape };

        // Calculate the scale factor from original image to current display
        const scaleX = imageInfo.width / imageInfo.originalWidth;
        const scaleY = imageInfo.height / imageInfo.originalHeight;

        switch (shape.type) {
            case 'rectangle':
                transformedShape.x = imageInfo.x + (shape.x * scaleX);
                transformedShape.y = imageInfo.y + (shape.y * scaleY);
                transformedShape.width = shape.width * scaleX;
                transformedShape.height = shape.height * scaleY;
                break;

            case 'circle':
                transformedShape.centerX = imageInfo.x + (shape.centerX * scaleX);
                transformedShape.centerY = imageInfo.y + (shape.centerY * scaleY);
                transformedShape.radius = shape.radius * scaleX; // Use scaleX for radius
                break;

            case 'polygon':
            case 'detected-contour':
                if (shape.points && shape.points.length > 0) {
                    transformedShape.points = shape.points.map(point => ({
                        x: imageInfo.x + (point.x * scaleX),
                        y: imageInfo.y + (point.y * scaleY)
                    }));
                }
                break;
        }

        return transformedShape;
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

        // Draw permanent dimension labels
        this.drawRectangleDimensions(ctx, shape);
    },

    // Draw rectangle without dimensions (for left canvas)
    drawRectangleWithoutDimensions(ctx, shape) {
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

        // NO dimension labels for clean view
    },

    // Draw permanent dimension labels for rectangle
    drawRectangleDimensions(ctx, shape) {
        if (!shape.scale) return; // Need scale to show dimensions

        const widthMM = Math.abs(shape.width) / shape.scale;
        const heightMM = Math.abs(shape.height) / shape.scale;

        ctx.save();
        ctx.fillStyle = '#ffff00'; // Bright yellow
        ctx.strokeStyle = '#000000'; // Black outline
        ctx.lineWidth = 1;
        ctx.font = '12px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Length text at top of rectangle
        const topX = shape.x + shape.width / 2;
        const topY = shape.y - 8; // 8px above rectangle
        const lengthText = `${widthMM.toFixed(1)} mm`;

        ctx.strokeText(lengthText, topX, topY);
        ctx.fillText(lengthText, topX, topY);

        // Width text at left of rectangle
        ctx.save();
        ctx.translate(shape.x - 8, shape.y + shape.height / 2); // 8px left of rectangle
        ctx.rotate(-Math.PI / 2); // Rotate 90 degrees for vertical text
        const widthText = `${heightMM.toFixed(1)} mm`;

        ctx.strokeText(widthText, 0, 0);
        ctx.fillText(widthText, 0, 0);
        ctx.restore();

        ctx.restore();
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

    drawShapeNumber(ctx, shape, number, strokeColor, zoom = 1) {
        // Calculate the position for the number label
        let labelX, labelY;

        // Scale offset distances with zoom
        const offsetScale = Math.max(0.5, Math.min(2, zoom)); // Clamp scaling for readability

        switch (shape.type) {
            case 'rectangle':
                // Position at top-left corner with offset
                labelX = shape.x - (25 * offsetScale);
                labelY = shape.y - (5 * offsetScale);
                break;
            case 'circle':
                // Position at top of circle
                labelX = shape.centerX - (15 * offsetScale);
                labelY = shape.centerY - shape.radius - (15 * offsetScale);
                break;
            case 'polygon':
            case 'detected-contour':
                // Position at the topmost point
                if (shape.points && shape.points.length > 0) {
                    const topPoint = shape.points.reduce((top, point) =>
                        point.y < top.y ? point : top, shape.points[0]);
                    labelX = topPoint.x - (15 * offsetScale);
                    labelY = topPoint.y - (15 * offsetScale);
                } else {
                    labelX = 0;
                    labelY = 0;
                }
                break;
            default:
                labelX = 0;
                labelY = 0;
        }

        // Draw number background circle - scale with zoom
        ctx.save();
        ctx.fillStyle = strokeColor;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2 * offsetScale;

        const radius = 12 * offsetScale;
        ctx.beginPath();
        ctx.arc(labelX, labelY, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.stroke();

        // Draw number text - scale font with zoom
        ctx.fillStyle = '#ffffff';
        const fontSize = Math.max(10, 14 * offsetScale); // Minimum readable size
        ctx.font = `bold ${fontSize}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(number.toString(), labelX, labelY);

        ctx.restore();
    },

    // Convert canvas coordinates to image coordinates
    canvasToImageCoords(canvasX, canvasY, app) {
        const imageInfo = app.getImageDrawInfo();
        if (!imageInfo) return { x: canvasX, y: canvasY };

        // Convert from canvas space to image space
        const imageX = (canvasX - imageInfo.x) * (imageInfo.originalWidth / imageInfo.width);
        const imageY = (canvasY - imageInfo.y) * (imageInfo.originalHeight / imageInfo.height);

        return { x: imageX, y: imageY };
    },

    // Show dimensions while dragging rectangle
    showDimensionsWhileDragging(ctx, shape, app) {
        if (shape.type !== 'rectangle') return;

        const imageInfo = app.getImageDrawInfo();
        if (!imageInfo) return;

        // Convert shape dimensions to real-world units
        const widthMM = Math.abs(shape.width) / app.scale;
        const heightMM = Math.abs(shape.height) / app.scale;

        // Transform shape coordinates to canvas space for display
        const transformedShape = this.transformShapeCoordinates(shape, app.zoom, app.panX, app.panY, imageInfo);

        // Calculate position for dimension text (center of rectangle)
        const centerX = transformedShape.x + transformedShape.width / 2;
        const centerY = transformedShape.y + transformedShape.height / 2;

        // Draw dimension text
        ctx.save();
        ctx.fillStyle = '#ffff00'; // Bright yellow for visibility
        ctx.strokeStyle = '#000000'; // Black outline
        ctx.lineWidth = 2;
        ctx.font = '14px Consolas, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const dimensionText = `${widthMM.toFixed(1)} × ${heightMM.toFixed(1)} mm`;

        // Draw text outline
        ctx.strokeText(dimensionText, centerX, centerY);
        // Draw text fill
        ctx.fillText(dimensionText, centerX, centerY);

        ctx.restore();
    },

    // Mouse event handlers
    handleMouseDown(x, y, tool, app) {
        this.isDrawing = true;
        this.startPoint = { x, y };

        // Convert canvas coordinates to image coordinates
        const imageCoords = this.canvasToImageCoords(x, y, app);

        switch (tool) {
            case 'rectangle':
                this.startRectangle(imageCoords.x, imageCoords.y);
                break;
            case 'circle':
                this.startCircle(imageCoords.x, imageCoords.y);
                break;
            case 'polygon':
                this.addPolygonPoint(imageCoords.x, imageCoords.y, app);
                break;
        }
    },

    handleMouseMove(x, y, tool, app) {
        if (!this.isDrawing && tool !== 'polygon') return;

        // Convert canvas coordinates to image coordinates
        const imageCoords = this.canvasToImageCoords(x, y, app);

        switch (tool) {
            case 'rectangle':
                this.updateRectangle(imageCoords.x, imageCoords.y, app);
                break;
            case 'circle':
                this.updateCircle(imageCoords.x, imageCoords.y, app);
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
        // Store start point in image coordinates
        this.startPointImage = { x, y };
    },

    updateRectangle(x, y, app) {
        if (!this.currentShape) return;

        this.currentShape.width = x - this.startPointImage.x;
        this.currentShape.height = y - this.startPointImage.y;

        // Handle negative dimensions
        if (this.currentShape.width < 0) {
            this.currentShape.x = x;
            this.currentShape.width = Math.abs(this.currentShape.width);
        } else {
            this.currentShape.x = this.startPointImage.x;
        }

        if (this.currentShape.height < 0) {
            this.currentShape.y = y;
            this.currentShape.height = Math.abs(this.currentShape.height);
        } else {
            this.currentShape.y = this.startPointImage.y;
        }

        app.drawBothCanvases();
        this.drawShapeWithoutDimensions(app.leftCtx, this.currentShape, null, app.zoom, app.panX, app.panY, app.getImageDrawInfoLeft());

        // Show dimensions while dragging on left canvas
        this.showDimensionsWhileDragging(app.leftCtx, this.currentShape, app);
    },

    // Circle tool
    startCircle(x, y) {
        this.currentShape = {
            type: 'circle',
            centerX: x,
            centerY: y,
            radius: 0
        };
        // Store start point in image coordinates
        this.startPointImage = { x, y };
    },

    updateCircle(x, y, app) {
        if (!this.currentShape) return;

        const dx = x - this.currentShape.centerX;
        const dy = y - this.currentShape.centerY;
        this.currentShape.radius = Math.sqrt(dx * dx + dy * dy);

        app.drawBothCanvases();
        this.drawShapeWithoutDimensions(app.leftCtx, this.currentShape, null, app.zoom, app.panX, app.panY, app.getImageDrawInfoLeft());
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

        app.drawBothCanvases();
        this.drawShapeWithoutDimensions(app.leftCtx, this.currentShape, null, app.zoom, app.panX, app.panY, app.getImageDrawInfoLeft());
    },

    finishShape(tool, app) {
        if (!this.currentShape) return;

        // Only add valid shapes
        if (tool === 'rectangle' && (this.currentShape.width > 5 && this.currentShape.height > 5)) {
            // Add scale to rectangle for dimension display
            this.currentShape.scale = app.scale;
            app.shapes.push(this.currentShape);
        } else if (tool === 'circle' && this.currentShape.radius > 5) {
            // Add scale to circle for dimension display
            this.currentShape.scale = app.scale;
            app.shapes.push(this.currentShape);
        }

        this.currentShape = null;
        app.drawBothCanvases();
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
