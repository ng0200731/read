// Application Version
const APP_VERSION = "1.2.3";

// Main Application Controller
class ImageAnalysisApp {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.image = null;
        this.originalImage = null; // Store original for rotation
        this.rotation = 0; // Current rotation in degrees
        this.scale = 1; // pixels per mm
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.currentTool = null;
        this.shapes = [];
        this.isCalibrating = false;
        this.calibrationPoints = [];
        this.version = APP_VERSION;

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupFileUpload();
        this.initializeVersion();
        console.log(`Image Analysis App v${this.version} initialized`);
    }

    initializeVersion() {
        const versionElement = document.getElementById('versionNumber');
        if (versionElement) {
            versionElement.textContent = this.version;
        }

        // Add version to page title
        document.title = `Image Pattern Analysis Tool v${this.version}`;

        // Log version info
        console.log(`%c🔧 Image Analysis Tool v${this.version}`, 'color: #4ec9b0; font-weight: bold;');
        console.log(`%cFeatures: Numbered regions, clipboard support, detail view, independent scrolling`, 'color: #969696;');
    }

    setupCanvas() {
        this.canvas = document.getElementById('mainCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Set initial canvas size
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        const container = this.canvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        this.canvas.width = rect.width - 20;
        this.canvas.height = rect.height - 20;
        
        if (this.image) {
            this.drawImage();
        }
    }

    setupEventListeners() {
        // File upload
        document.getElementById('selectFileBtn').addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        document.getElementById('fileInput').addEventListener('change', (e) => {
            this.handleFileSelect(e.target.files[0]);
        });

        // Calibration
        document.getElementById('calibrateBtn').addEventListener('click', () => {
            this.startCalibration();
        });

        document.getElementById('confirmCalibration').addEventListener('click', () => {
            this.confirmCalibration();
        });

        document.getElementById('cancelCalibration').addEventListener('click', () => {
            this.cancelCalibration();
        });

        // Tools
        document.getElementById('autoDetectBtn').addEventListener('click', () => {
            this.autoDetectShapes();
        });

        document.getElementById('rectangleToolBtn').addEventListener('click', () => {
            this.setTool('rectangle');
        });

        document.getElementById('circleToolBtn').addEventListener('click', () => {
            this.setTool('circle');
        });

        document.getElementById('polygonToolBtn').addEventListener('click', () => {
            this.setTool('polygon');
        });

        document.getElementById('clearAllBtn').addEventListener('click', () => {
            this.clearAllShapes();
        });

        // Zoom controls
        document.getElementById('zoomInBtn').addEventListener('click', () => {
            this.zoomIn();
        });

        document.getElementById('zoomOutBtn').addEventListener('click', () => {
            this.zoomOut();
        });

        document.getElementById('resetZoomBtn').addEventListener('click', () => {
            this.resetZoom();
        });

        // Cost calculation
        document.getElementById('calculateCostBtn').addEventListener('click', () => {
            this.calculateTotalCost();
        });

        // Export
        document.getElementById('exportDataBtn').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('exportImageBtn').addEventListener('click', () => {
            this.exportImage();
        });

        // Detail View
        document.getElementById('detailViewBtn').addEventListener('click', () => {
            this.openDetailView();
        });

        document.getElementById('closeDetailView').addEventListener('click', () => {
            this.closeDetailView();
        });

        // Close detail view when clicking outside
        document.getElementById('detailViewModal').addEventListener('click', (e) => {
            if (e.target.id === 'detailViewModal') {
                this.closeDetailView();
            }
        });

        // New button
        document.getElementById('newBtn').addEventListener('click', () => {
            this.newProject();
        });

        // Rotation controls
        document.getElementById('rotateLeftBtn').addEventListener('click', () => {
            this.rotateImage(-90);
        });

        document.getElementById('rotateRightBtn').addEventListener('click', () => {
            this.rotateImage(90);
        });

        // Canvas mouse events
        this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
    }

    setupFileUpload() {
        const uploadArea = document.getElementById('uploadArea');

        // Drag and drop
        uploadArea.addEventListener('dragover', (e) => {
            e.preventDefault();
            uploadArea.classList.add('dragover');
        });

        uploadArea.addEventListener('dragleave', () => {
            uploadArea.classList.remove('dragover');
        });

        uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            uploadArea.classList.remove('dragover');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files[0]);
            }
        });

        // Click to upload
        uploadArea.addEventListener('click', () => {
            document.getElementById('fileInput').click();
        });

        // Clipboard support (Ctrl+V to paste images)
        this.setupClipboardSupport();
    }

    setupClipboardSupport() {
        // Global paste event listener for Ctrl+V
        document.addEventListener('paste', (e) => {
            e.preventDefault();

            const items = e.clipboardData.items;
            for (let i = 0; i < items.length; i++) {
                const item = items[i];

                // Check if the item is an image
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    this.handleFileSelect(file);

                    // Show feedback to user
                    this.showClipboardFeedback('Image pasted successfully!');
                    break;
                }
            }
        });

        // Global copy event listener for Ctrl+C (copy current image)
        document.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'c' && this.image) {
                // Only copy if we're not in an input field
                if (!e.target.matches('input, textarea')) {
                    e.preventDefault();
                    this.copyImageToClipboard();
                }
            }
        });

        // Add visual feedback for clipboard operations
        this.createClipboardFeedback();
    }

    createClipboardFeedback() {
        // Create feedback element if it doesn't exist
        if (!document.getElementById('clipboardFeedback')) {
            const feedback = document.createElement('div');
            feedback.id = 'clipboardFeedback';
            feedback.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #4CAF50;
                color: white;
                padding: 12px 20px;
                border-radius: 4px;
                z-index: 1000;
                opacity: 0;
                transition: opacity 0.3s ease;
                font-family: Arial, sans-serif;
                font-size: 14px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            `;
            document.body.appendChild(feedback);
        }
    }

    showClipboardFeedback(message, isError = false) {
        const feedback = document.getElementById('clipboardFeedback');
        feedback.textContent = message;
        feedback.style.background = isError ? '#f44336' : '#4CAF50';
        feedback.style.opacity = '1';

        setTimeout(() => {
            feedback.style.opacity = '0';
        }, 2000);
    }

    async copyImageToClipboard() {
        try {
            if (!this.canvas || !this.image) {
                this.showClipboardFeedback('No image to copy', true);
                return;
            }

            // Convert canvas to blob
            this.canvas.toBlob(async (blob) => {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    this.showClipboardFeedback('Image copied to clipboard!');
                } catch (err) {
                    console.error('Failed to copy image:', err);
                    this.showClipboardFeedback('Failed to copy image', true);
                }
            }, 'image/png');
        } catch (err) {
            console.error('Failed to copy image:', err);
            this.showClipboardFeedback('Failed to copy image', true);
        }
    }

    handleFileSelect(file) {
        if (!file || !file.type.startsWith('image/')) {
            alert('Please select a valid image file');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.loadImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    loadImage(src) {
        const img = new Image();
        img.onload = () => {
            this.originalImage = img; // Store original
            this.image = img;
            this.rotation = 0; // Reset rotation
            this.resetZoom();
            this.drawImage();
            this.updateImageInfo();
            this.enableControls();

            // Hide overlay
            document.getElementById('canvasOverlay').classList.add('hidden');
        };
        img.src = src;
    }

    drawImage() {
        if (!this.image || !this.canvas || !this.ctx) return;

        // Store current canvas state to prevent interference
        this.ctx.save();

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Calculate image position and size
        const imgAspect = this.image.width / this.image.height;
        const canvasAspect = this.canvas.width / this.canvas.height;

        let drawWidth, drawHeight;
        if (imgAspect > canvasAspect) {
            drawWidth = this.canvas.width * this.zoom;
            drawHeight = drawWidth / imgAspect;
        } else {
            drawHeight = this.canvas.height * this.zoom;
            drawWidth = drawHeight * imgAspect;
        }

        const x = (this.canvas.width - drawWidth) / 2 + this.panX;
        const y = (this.canvas.height - drawHeight) / 2 + this.panY;

        // Ensure we have valid drawing coordinates
        if (isFinite(x) && isFinite(y) && isFinite(drawWidth) && isFinite(drawHeight) &&
            drawWidth > 0 && drawHeight > 0) {
            this.ctx.drawImage(this.image, x, y, drawWidth, drawHeight);
        }

        // Draw shapes
        this.drawShapes();

        // Draw calibration points if calibrating
        if (this.isCalibrating) {
            this.drawCalibrationPoints();
        }

        // Restore canvas state
        this.ctx.restore();
    }

    drawShapes() {
        // This will be implemented in canvas-tools.js
        if (window.CanvasTools) {
            window.CanvasTools.drawShapes(this.ctx, this.shapes);
        }
    }

    drawCalibrationPoints() {
        this.ctx.fillStyle = 'red';
        this.ctx.strokeStyle = 'red';
        this.ctx.lineWidth = 2;

        this.calibrationPoints.forEach((point, index) => {
            this.ctx.beginPath();
            this.ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            this.ctx.fill();
            
            this.ctx.fillText(`P${index + 1}`, point.x + 10, point.y - 10);
        });

        if (this.calibrationPoints.length === 2) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.calibrationPoints[0].x, this.calibrationPoints[0].y);
            this.ctx.lineTo(this.calibrationPoints[1].x, this.calibrationPoints[1].y);
            this.ctx.stroke();
        }
    }

    updateImageInfo() {
        const info = document.getElementById('imageInfo');
        if (this.image) {
            info.innerHTML = `
                <p><strong>Dimensions:</strong> ${this.image.width} × ${this.image.height} px</p>
                <p><strong>Aspect Ratio:</strong> ${(this.image.width / this.image.height).toFixed(2)}</p>
                <p><strong>Scale:</strong> ${this.scale > 0 ? (1/this.scale).toFixed(3) + ' px/mm' : 'Not calibrated'}</p>
            `;
        }
    }

    enableControls() {
        const buttons = [
            'calibrateBtn', 'autoDetectBtn', 'rectangleToolBtn',
            'circleToolBtn', 'polygonToolBtn', 'clearAllBtn',
            'zoomInBtn', 'zoomOutBtn', 'resetZoomBtn', 'detailViewBtn',
            'rotateLeftBtn', 'rotateRightBtn',
            'calculateCostBtn', 'exportDataBtn', 'exportImageBtn'
        ];

        buttons.forEach(id => {
            document.getElementById(id).disabled = false;
        });
    }

    // Mouse event handlers
    handleMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.isCalibrating) {
            this.addCalibrationPoint(x, y);
        } else if (this.currentTool) {
            // Tool-specific mouse handling will be in canvas-tools.js
            if (window.CanvasTools) {
                window.CanvasTools.handleMouseDown(x, y, this.currentTool, this);
            }
        }
    }

    handleMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.currentTool && window.CanvasTools) {
            window.CanvasTools.handleMouseMove(x, y, this.currentTool, this);
        }
    }

    handleMouseUp(e) {
        if (this.currentTool && window.CanvasTools) {
            window.CanvasTools.handleMouseUp(this.currentTool, this);
        }
    }

    handleWheel(e) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        this.zoom *= delta;
        this.zoom = Math.max(0.1, Math.min(5, this.zoom));
        this.updateZoomDisplay();
        this.drawImage();
    }

    // Calibration methods
    startCalibration() {
        this.isCalibrating = true;
        this.calibrationPoints = [];
        document.getElementById('canvasInstructions').textContent = 'Click two points to set scale';
        document.getElementById('calibrateBtn').textContent = 'Calibrating...';
        document.getElementById('calibrateBtn').disabled = true;
    }

    addCalibrationPoint(x, y) {
        if (this.calibrationPoints.length < 2) {
            this.calibrationPoints.push({ x, y });
            this.drawImage();
            
            if (this.calibrationPoints.length === 2) {
                document.getElementById('calibrationInput').style.display = 'block';
                document.getElementById('canvasInstructions').textContent = 'Enter the real measurement';
            }
        }
    }

    confirmCalibration() {
        const realMeasurement = parseFloat(document.getElementById('realMeasurement').value);
        if (!realMeasurement || realMeasurement <= 0) {
            alert('Please enter a valid measurement');
            return;
        }

        const p1 = this.calibrationPoints[0];
        const p2 = this.calibrationPoints[1];
        const pixelDistance = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
        
        this.scale = pixelDistance / realMeasurement; // pixels per mm
        
        this.isCalibrating = false;
        this.calibrationPoints = [];
        
        document.getElementById('calibrationInput').style.display = 'none';
        document.getElementById('realMeasurement').value = '';
        document.getElementById('calibrateBtn').textContent = 'Set Scale';
        document.getElementById('calibrateBtn').disabled = false;
        document.getElementById('canvasInstructions').textContent = 'Scale calibrated successfully';
        
        this.updateScaleInfo();
        this.updateImageInfo();
        this.drawImage();
    }

    cancelCalibration() {
        this.isCalibrating = false;
        this.calibrationPoints = [];
        
        document.getElementById('calibrationInput').style.display = 'none';
        document.getElementById('realMeasurement').value = '';
        document.getElementById('calibrateBtn').textContent = 'Set Scale';
        document.getElementById('calibrateBtn').disabled = false;
        document.getElementById('canvasInstructions').textContent = 'Calibration cancelled';
        
        this.drawImage();
    }

    updateScaleInfo() {
        const scaleInfo = document.getElementById('scaleInfo');
        if (this.scale > 0) {
            scaleInfo.innerHTML = `Scale: ${(1/this.scale).toFixed(3)} pixels per mm`;
            scaleInfo.style.display = 'block';
        }
    }

    // Tool methods
    setTool(tool) {
        this.currentTool = tool;
        
        // Update button states
        document.querySelectorAll('.btn-tool').forEach(btn => {
            btn.classList.remove('active');
        });
        document.getElementById(tool + 'ToolBtn').classList.add('active');
        
        document.getElementById('canvasInstructions').textContent = `${tool.charAt(0).toUpperCase() + tool.slice(1)} tool selected`;
    }

    autoDetectShapes() {
        if (window.ImageProcessor) {
            this.clearShapeSelection();
            const detectedShapes = window.ImageProcessor.detectShapes(this.image, this.scale);
            this.shapes.push(...detectedShapes);
            this.drawImage();
            this.updateResults();
        }
    }

    clearAllShapes() {
        this.clearShapeSelection();
        this.shapes = [];
        this.drawImage();
        this.updateResults();
    }

    // Zoom methods
    zoomIn() {
        this.zoom *= 1.2;
        this.zoom = Math.min(5, this.zoom);
        this.updateZoomDisplay();
        this.drawImage();
    }

    zoomOut() {
        this.zoom *= 0.8;
        this.zoom = Math.max(0.1, this.zoom);
        this.updateZoomDisplay();
        this.drawImage();
    }

    resetZoom() {
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.updateZoomDisplay();
        this.drawImage();
    }

    updateZoomDisplay() {
        document.getElementById('zoomLevel').textContent = Math.round(this.zoom * 100) + '%';
    }

    // Results and calculations
    updateResults() {
        const resultsArea = document.getElementById('resultsArea');

        if (this.shapes.length === 0) {
            resultsArea.innerHTML = '<p class="no-results">No measurements yet</p>';
            return;
        }

        let html = '';
        this.shapes.forEach((shape, index) => {
            const area = this.calculateShapeArea(shape);
            const shapeClass = shape.type.replace('-', '');
            const shapeNumber = index + 1;

            // Get color based on shape type for consistency with canvas
            const colors = {
                'rectangle': '#ff6b6b',
                'circle': '#4ecdc4',
                'polygon': '#45b7d1',
                'detected-contour': '#f9ca24',
                'detectedcontour': '#f9ca24'
            };
            const shapeColor = colors[shapeClass] || '#cccccc';

            html += `
                <div class="result-item ${shapeClass}" data-shape-index="${index}">
                    <div class="result-header">
                        <span class="shape-number" style="background-color: ${shapeColor};">${shapeNumber}</span>
                        <h4>${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)}</h4>
                    </div>
                    <div class="result-details">
                        <p><strong>Area:</strong> ${area.toFixed(2)} mm²</p>
                        <p><strong>Perimeter:</strong> ${this.calculateShapePerimeter(shape).toFixed(2)} mm</p>
                    </div>
                </div>
            `;
        });

        resultsArea.innerHTML = html;

        // Add hover effects to highlight shapes
        this.setupResultHoverEffects();
    }

    setupResultHoverEffects() {
        const resultItems = document.querySelectorAll('.result-item');

        // Simple, clean event handling - let CSS handle the isolation
        resultItems.forEach((item, index) => {
            item.addEventListener('mouseenter', () => {
                this.highlightShape(index, true);
            });

            item.addEventListener('mouseleave', () => {
                this.highlightShape(index, false);
            });

            item.addEventListener('dblclick', () => {
                this.focusOnShape(index);
            });

            item.addEventListener('click', () => {
                this.selectShape(index);
            });
        });
    }

    selectShape(shapeIndex) {
        // Clear previous selection
        this.clearShapeSelection();

        if (shapeIndex >= 0 && shapeIndex < this.shapes.length) {
            const shape = this.shapes[shapeIndex];

            // Mark as selected with a different style
            shape._selected = true;
            shape._originalLineWidth = shape.lineWidth || 2;
            shape._originalStroke = shape.color;
            shape.lineWidth = 3;
            shape.color = '#00ff00'; // Green for selection

            this.drawImage();

            // Update result item visual state
            document.querySelectorAll('.result-item').forEach((item, index) => {
                if (index === shapeIndex) {
                    item.classList.add('selected');
                } else {
                    item.classList.remove('selected');
                }
            });
        }
    }

    clearShapeSelection() {
        this.shapes.forEach(shape => {
            if (shape._selected) {
                shape.lineWidth = shape._originalLineWidth || 2;
                shape.color = shape._originalStroke;
                delete shape._selected;
                delete shape._originalLineWidth;
                delete shape._originalStroke;
            }
        });

        // Clear visual selection from result items
        document.querySelectorAll('.result-item').forEach(item => {
            item.classList.remove('selected');
        });
    }

    highlightShape(shapeIndex, highlight) {
        if (shapeIndex >= 0 && shapeIndex < this.shapes.length) {
            const shape = this.shapes[shapeIndex];

            // Don't highlight if already selected
            if (shape._selected && highlight) return;

            // Store original properties if highlighting
            if (highlight) {
                if (!shape._selected) {
                    shape._originalLineWidth = shape.lineWidth || 2;
                    shape._originalStroke = shape.color;
                    shape.lineWidth = 4;
                    shape.color = '#ffffff';
                }
            } else {
                // Restore original properties only if not selected
                if (!shape._selected) {
                    shape.lineWidth = shape._originalLineWidth || 2;
                    shape.color = shape._originalStroke;
                    delete shape._originalLineWidth;
                    delete shape._originalStroke;
                }
            }

            this.drawImage();
        }
    }

    focusOnShape(shapeIndex) {
        if (shapeIndex >= 0 && shapeIndex < this.shapes.length) {
            const shape = this.shapes[shapeIndex];

            // Calculate shape bounds
            let bounds = this.getShapeBounds(shape);

            if (bounds) {
                // Add padding
                const padding = 50;
                bounds.x -= padding;
                bounds.y -= padding;
                bounds.width += padding * 2;
                bounds.height += padding * 2;

                // Calculate zoom to fit shape
                const canvasAspect = this.canvas.width / this.canvas.height;
                const boundsAspect = bounds.width / bounds.height;

                let newZoom;
                if (boundsAspect > canvasAspect) {
                    newZoom = this.canvas.width / bounds.width;
                } else {
                    newZoom = this.canvas.height / bounds.height;
                }

                // Limit zoom
                newZoom = Math.max(0.1, Math.min(3, newZoom));

                // Calculate pan to center shape
                const shapeCenterX = bounds.x + bounds.width / 2;
                const shapeCenterY = bounds.y + bounds.height / 2;

                this.zoom = newZoom;
                this.panX = this.canvas.width / 2 - shapeCenterX * newZoom;
                this.panY = this.canvas.height / 2 - shapeCenterY * newZoom;

                this.updateZoomDisplay();
                this.drawImage();
            }
        }
    }

    getShapeBounds(shape) {
        switch (shape.type) {
            case 'rectangle':
                return {
                    x: shape.x,
                    y: shape.y,
                    width: shape.width,
                    height: shape.height
                };

            case 'circle':
                return {
                    x: shape.centerX - shape.radius,
                    y: shape.centerY - shape.radius,
                    width: shape.radius * 2,
                    height: shape.radius * 2
                };

            case 'polygon':
            case 'detected-contour':
                if (shape.points && shape.points.length > 0) {
                    let minX = shape.points[0].x;
                    let maxX = shape.points[0].x;
                    let minY = shape.points[0].y;
                    let maxY = shape.points[0].y;

                    shape.points.forEach(point => {
                        minX = Math.min(minX, point.x);
                        maxX = Math.max(maxX, point.x);
                        minY = Math.min(minY, point.y);
                        maxY = Math.max(maxY, point.y);
                    });

                    return {
                        x: minX,
                        y: minY,
                        width: maxX - minX,
                        height: maxY - minY
                    };
                }
                break;
        }
        return null;
    }

    calculateShapeArea(shape) {
        if (window.Calculator) {
            return window.Calculator.calculateArea(shape, this.scale);
        }
        return 0;
    }

    calculateShapePerimeter(shape) {
        if (window.Calculator) {
            return window.Calculator.calculatePerimeter(shape, this.scale);
        }
        return 0;
    }

    calculateTotalCost() {
        const costPerSqMm = parseFloat(document.getElementById('costPerSqMm').value);
        if (!costPerSqMm || costPerSqMm <= 0) {
            alert('Please enter a valid cost per square mm');
            return;
        }

        let totalArea = 0;
        this.shapes.forEach(shape => {
            totalArea += this.calculateShapeArea(shape);
        });

        const totalCost = totalArea * costPerSqMm;
        
        document.getElementById('totalCost').innerHTML = `
            <strong>Total Area:</strong> ${totalArea.toFixed(2)} mm²<br>
            <strong>Cost per mm²:</strong> $${costPerSqMm.toFixed(3)}<br>
            <strong>Total Cost:</strong> $${totalCost.toFixed(2)}
        `;
    }

    // Export methods
    exportData() {
        const data = {
            version: this.version,
            timestamp: new Date().toISOString(),
            image: {
                width: this.image.width,
                height: this.image.height,
                scale: this.scale
            },
            shapes: this.shapes.map(shape => ({
                type: shape.type,
                area: this.calculateShapeArea(shape),
                perimeter: this.calculateShapePerimeter(shape),
                coordinates: shape.points || shape
            })),
            totalArea: this.shapes.reduce((sum, shape) => sum + this.calculateShapeArea(shape), 0)
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'image-analysis-data.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    exportImage() {
        const link = document.createElement('a');
        link.download = 'analyzed-image.png';
        link.href = this.canvas.toDataURL();
        link.click();
    }

    // Detail View Methods
    openDetailView() {
        if (!this.image) {
            alert('Please load an image first');
            return;
        }

        const modal = document.getElementById('detailViewModal');
        const originalCanvas = document.getElementById('originalDetailCanvas');
        const analyzedCanvas = document.getElementById('analyzedDetailCanvas');

        // Set up canvases at 1:1 scale
        const imageWidth = this.image.width;
        const imageHeight = this.image.height;

        // Original image canvas
        originalCanvas.width = imageWidth;
        originalCanvas.height = imageHeight;
        const originalCtx = originalCanvas.getContext('2d');
        originalCtx.drawImage(this.image, 0, 0);

        // Analyzed image canvas
        analyzedCanvas.width = imageWidth;
        analyzedCanvas.height = imageHeight;
        const analyzedCtx = analyzedCanvas.getContext('2d');

        // Draw image
        analyzedCtx.drawImage(this.image, 0, 0);

        // Draw shapes at 1:1 scale
        if (window.CanvasTools && this.shapes.length > 0) {
            window.CanvasTools.drawShapes(analyzedCtx, this.shapes);
        }

        // Show modal
        modal.style.display = 'flex';

        // Add escape key listener
        this.detailViewKeyHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeDetailView();
            }
        };
        document.addEventListener('keydown', this.detailViewKeyHandler);
    }

    closeDetailView() {
        const modal = document.getElementById('detailViewModal');
        modal.style.display = 'none';

        // Remove escape key listener
        if (this.detailViewKeyHandler) {
            document.removeEventListener('keydown', this.detailViewKeyHandler);
            this.detailViewKeyHandler = null;
        }
    }

    // New Project Method
    newProject() {
        if (confirm('Start a new project? This will clear all current work.')) {
            // Reset all properties
            this.image = null;
            this.originalImage = null;
            this.rotation = 0;
            this.scale = 1;
            this.zoom = 1;
            this.panX = 0;
            this.panY = 0;
            this.currentTool = null;
            this.shapes = [];
            this.isCalibrating = false;
            this.calibrationPoints = [];

            // Clear canvas
            if (this.ctx) {
                this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            }

            // Reset UI
            this.updateResults();
            this.updateImageInfo();
            this.updateZoomLevel();

            // Show overlay
            document.getElementById('canvasOverlay').classList.remove('hidden');

            // Disable controls
            const buttons = [
                'calibrateBtn', 'autoDetectBtn', 'rectangleToolBtn',
                'circleToolBtn', 'polygonToolBtn', 'clearAllBtn',
                'zoomInBtn', 'zoomOutBtn', 'resetZoomBtn', 'detailViewBtn',
                'rotateLeftBtn', 'rotateRightBtn',
                'calculateCostBtn', 'exportDataBtn', 'exportImageBtn'
            ];

            buttons.forEach(id => {
                document.getElementById(id).disabled = true;
            });

            console.log('New project started');
        }
    }

    // Image Rotation Method
    rotateImage(degrees) {
        if (!this.originalImage) return;

        this.rotation = (this.rotation + degrees) % 360;
        if (this.rotation < 0) this.rotation += 360;

        // Create rotated image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        // Calculate new dimensions for rotated image
        const angle = (this.rotation * Math.PI) / 180;
        const cos = Math.abs(Math.cos(angle));
        const sin = Math.abs(Math.sin(angle));

        const newWidth = this.originalImage.width * cos + this.originalImage.height * sin;
        const newHeight = this.originalImage.width * sin + this.originalImage.height * cos;

        canvas.width = newWidth;
        canvas.height = newHeight;

        // Draw rotated image
        ctx.translate(newWidth / 2, newHeight / 2);
        ctx.rotate(angle);
        ctx.drawImage(
            this.originalImage,
            -this.originalImage.width / 2,
            -this.originalImage.height / 2
        );

        // Create new image from rotated canvas
        const rotatedImg = new Image();
        rotatedImg.onload = () => {
            this.image = rotatedImg;
            this.drawImage();
            this.updateImageInfo();
        };
        rotatedImg.src = canvas.toDataURL();

        console.log(`Image rotated to ${this.rotation}°`);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ImageAnalysisApp();
});
