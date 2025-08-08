// Application Version
const APP_VERSION = "2.1.2";

// Main Application Controller
class ImageAnalysisApp {
    constructor() {
        // Left canvas (image + rectangles without dimensions)
        this.leftCanvas = null;
        this.leftCtx = null;
        // Right canvas (rectangles only with dimensions)
        this.rightCanvas = null;
        this.rightCtx = null;

        this.image = null;
        this.originalImage = null; // Store original for rotation
        this.rotation = 0; // Current rotation in degrees
        this.scale = 0; // pixels per mm (0 until calibrated)
        this.zoom = 1;
        this.panX = 0;
        this.panY = 0;
        this.currentTool = null;
        this.isPanning = false;
        this.lastPanX = 0;
        this.lastPanY = 0;
        this.shapes = [];
        this.isCalibrating = false;
        this.calibrationPoints = [];
        this.version = APP_VERSION;

        // Shape editing state
        this.isEditingShape = false;
        this.editingShapeIndex = -1;
        this.originalShape = null;
        this.editingHandles = [];
        this.dragHandle = null;
        this.isRegeneratingHandles = false;

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.setupCanvasUpload();
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
        // Setup left canvas (image + rectangles without dimensions)
        this.leftCanvas = document.getElementById('leftCanvas');
        this.leftCtx = this.leftCanvas.getContext('2d');
        // Legacy aliases for features that reference this.canvas/this.ctx
        this.canvas = this.leftCanvas;
        this.ctx = this.leftCtx;

        // Setup right canvas (rectangles only with dimensions)
        this.rightCanvas = document.getElementById('rightCanvas');
        this.rightCtx = this.rightCanvas.getContext('2d');

        // Set initial canvas sizes
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
    }

    resizeCanvas() {
        // Resize left canvas
        const leftContainer = this.leftCanvas.parentElement;
        const leftRect = leftContainer.getBoundingClientRect();

        this.leftCanvas.width = leftRect.width - 20;
        this.leftCanvas.height = leftRect.height - 20;

        // Resize right canvas (same size as left)
        const rightContainer = this.rightCanvas.parentElement;
        const rightRect = rightContainer.getBoundingClientRect();

        this.rightCanvas.width = rightRect.width - 20;
        this.rightCanvas.height = rightRect.height - 20;

        if (this.image) {
            this.drawBothCanvases();
        }
    }

    setupEventListeners() {


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

        // Detection Tool Dropdown
        document.getElementById('detectionToolSelect').addEventListener('change', (e) => {
            const selectedTool = e.target.value;

            switch (selectedTool) {
                case 'autoDetect':
                    this.autoDetectShapes();
                    // Reset dropdown after auto detection
                    e.target.value = '';
                    break;
                case 'rectangle':
                    this.setTool('rectangle');
                    break;
                case 'circle':
                    this.setTool('circle');
                    break;
                case 'polygon':
                    this.setTool('polygon');
                    break;
                default:
                    // Clear current tool if no valid selection
                    this.currentTool = null;
                    document.getElementById('canvasInstructions').textContent = 'Select a tool to start drawing';
                    break;
            }
        });

        // Delete All Results button
        document.getElementById('deleteAllResultsBtn').addEventListener('click', () => {
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



        // Rotation controls
        document.getElementById('rotateLeftBtn').addEventListener('click', () => {
            this.rotateImage(-90);
        });

        document.getElementById('rotateRightBtn').addEventListener('click', () => {
            this.rotateImage(90);
        });

        // Canvas mouse events (only on left canvas where user draws)
        this.leftCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.leftCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.leftCanvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.leftCanvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.leftCanvas.addEventListener('contextmenu', (e) => e.preventDefault()); // Disable right-click menu

        // Right canvas also needs wheel events for zoom synchronization and pan events
        this.rightCanvas.addEventListener('wheel', (e) => this.handleWheel(e));
        this.rightCanvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        this.rightCanvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.rightCanvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
        this.rightCanvas.addEventListener('contextmenu', (e) => e.preventDefault()); // Disable right-click menu

        // Setup resizable divider
        this.setupResizableDivider();

        // ESC key to cancel editing, Enter key to finish editing
        document.addEventListener('keydown', (e) => {
            if (this.isEditingShape) {
                if (e.key === 'Escape') {
                    this.cancelShapeEditing();
                } else if (e.key === 'Enter') {
                    this.finishShapeEditing();
                }
            }
        });
    }

    // Setup resizable divider between canvas panels
    setupResizableDivider() {
        const divider = document.getElementById('canvasDivider');
        const leftPanel = document.querySelector('.canvas-half.left-canvas');
        const rightPanel = document.querySelector('.canvas-half.right-canvas');
        const container = document.querySelector('.split-canvas-container');

        if (!divider || !leftPanel || !rightPanel || !container) return;

        let isResizing = false;
        let startX = 0;
        let startLeftWidth = 0;
        let startRightWidth = 0;

        const startResize = (e) => {
            isResizing = true;
            startX = e.clientX;
            startLeftWidth = leftPanel.offsetWidth;
            startRightWidth = rightPanel.offsetWidth;

            divider.classList.add('dragging');
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';

            console.log('🔄 Starting panel resize');
        };

        const doResize = (e) => {
            if (!isResizing) return;

            const deltaX = e.clientX - startX;
            const containerWidth = container.offsetWidth - 6; // Subtract divider width

            // Calculate new widths
            const newLeftWidth = startLeftWidth + deltaX;
            const newRightWidth = startRightWidth - deltaX;

            // Enforce minimum widths (20% each)
            const minWidth = containerWidth * 0.2;
            const maxLeftWidth = containerWidth - minWidth;
            const maxRightWidth = containerWidth - minWidth;

            if (newLeftWidth >= minWidth && newLeftWidth <= maxLeftWidth) {
                const leftPercent = (newLeftWidth / containerWidth) * 100;
                const rightPercent = (newRightWidth / containerWidth) * 100;

                leftPanel.style.width = `${leftPercent}%`;
                rightPanel.style.width = `${rightPercent}%`;

                // Simple space shift - no canvas resizing needed
            }
        };

        const stopResize = () => {
            if (!isResizing) return;

            isResizing = false;
            divider.classList.remove('dragging');
            document.body.style.cursor = '';
            document.body.style.userSelect = '';

            console.log('✅ Panel resize completed');
        };

        // Mouse events
        divider.addEventListener('mousedown', startResize);
        document.addEventListener('mousemove', doResize);
        document.addEventListener('mouseup', stopResize);

        // Touch events for mobile
        divider.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startResize(e.touches[0]);
        });

        document.addEventListener('touchmove', (e) => {
            e.preventDefault();
            doResize(e.touches[0]);
        });

        document.addEventListener('touchend', stopResize);

        // Reset button functionality
        const resetButton = document.getElementById('resetSplitBtn');
        if (resetButton) {
            resetButton.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent divider drag

                // Reset to 50/50 split
                leftPanel.style.width = '50%';
                rightPanel.style.width = '50%';

                console.log('🔄 Reset panels to 50/50 split');
            });
        }
    }



    setupCanvasUpload() {
        const canvasOverlay = document.getElementById('leftCanvasOverlay');
        const canvasInstructions = document.getElementById('canvasInstructions');
        const dragIndicator = document.querySelector('.drag-indicator');

        console.log('🎯 Setting up canvas upload for:', canvasOverlay);

        // Enhanced drag and drop with better visual feedback
        canvasOverlay.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            canvasOverlay.classList.add('dragover');
            this.showCanvasDragIndicator(true);
            console.log('📥 Drag enter on canvas');
        });

        canvasOverlay.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            canvasOverlay.classList.add('dragover');
        });

        canvasOverlay.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Only remove dragover if we're actually leaving the canvas overlay
            if (!canvasOverlay.contains(e.relatedTarget)) {
                canvasOverlay.classList.remove('dragover');
                this.showCanvasDragIndicator(false);
                console.log('📤 Drag leave from canvas');
            }
        });

        canvasOverlay.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            canvasOverlay.classList.remove('dragover');
            this.showCanvasDragIndicator(false);
            console.log('🎯 Drop on canvas');

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                console.log('📁 Processing dropped file on canvas:', files[0].name);
                this.handleFileSelect(files[0]);
            } else {
                console.log('❌ No files in canvas drop event');
            }
        });

        // Create hidden file input for canvas upload
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/jpeg,image/jpg,image/gif,image/png';
        fileInput.style.display = 'none';
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                this.handleFileSelect(e.target.files[0]);
            }
        });
        document.body.appendChild(fileInput);

        // Click to upload on canvas
        canvasOverlay.addEventListener('click', () => {
            fileInput.click();
        });

        // Setup clipboard support
        this.setupClipboardSupport();

        // Setup drag and drop on the actual canvas for when image is loaded
        this.setupCanvasDragDrop();

        console.log('✅ Canvas upload setup complete');
    }

    setupCanvasDragDrop() {
        // Add drag and drop to the actual left canvas for when image is loaded
        this.leftCanvas.addEventListener('dragenter', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.image) {
                this.leftCanvas.style.border = '3px dashed #007bff';
            }
        });

        this.leftCanvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (this.image) {
                this.leftCanvas.style.border = '3px dashed #007bff';
            }
        });

        this.leftCanvas.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.leftCanvas.style.border = '';
        });

        this.leftCanvas.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.leftCanvas.style.border = '';

            const files = e.dataTransfer.files;
            if (files.length > 0) {
                console.log('📁 Processing dropped file on loaded canvas:', files[0].name);
                this.handleFileSelect(files[0]);
            }
        });
    }

    showCanvasDragIndicator(show) {
        const instructions = document.getElementById('canvasInstructions');
        const dragIndicator = document.querySelector('.drag-indicator');

        if (instructions && dragIndicator) {
            if (show) {
                instructions.style.display = 'none';
                dragIndicator.style.display = 'block';
            } else {
                instructions.style.display = 'block';
                dragIndicator.style.display = 'none';
            }
        }
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
            if (!this.rightCanvas && !this.canvas || !this.image) {
                this.showClipboardFeedback('No image to copy', true);
                return;
            }

            // Convert canvas to blob (prefer right canvas for clean dimensions view)
            const exportCanvas = this.rightCanvas || this.canvas;
            exportCanvas.toBlob(async (blob) => {
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
        console.log('📁 File selected:', file.name, 'Type:', file.type, 'Size:', file.size);

        if (!file) {
            alert('No file selected');
            return;
        }

        // Check if there's already an image loaded
        if (this.image) {
            const hasShapes = this.shapes.length > 0;
            const hasCalibration = this.isCalibrated;
            const hasScaleChanges = this.scale !== 0;
            const hasSettings = hasShapes || hasCalibration || hasScaleChanges;

            let message = 'Loading a new image will replace the current image';

            if (hasSettings) {
                message = 'Loading a new image will delete all present settings:\n\n';
                if (hasShapes) {
                    message += `• ${this.shapes.length} rectangle(s) will be deleted\n`;
                }
                if (hasCalibration) {
                    message += '• Calibration settings will be reset\n';
                }
                if (hasScaleChanges) {
                    message += '• Scale settings will be reset\n';
                }
                message += '• All measurements will be cleared\n\n';
            } else {
                message += '.\n\n';
            }

            message += 'Do you want to continue?';

            const confirmed = confirm(message);
            if (!confirmed) {
                console.log('🚫 User cancelled image loading');
                return;
            }

            console.log('✅ User confirmed - proceeding with new image');
        }

        // Validate file type - only JPG, GIF, and PNG allowed
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/gif', 'image/png'];
        if (!allowedTypes.includes(file.type.toLowerCase())) {
            alert('Please select a JPG, GIF, or PNG image file only.\nSelected file type: ' + file.type);
            console.log('❌ Invalid file type:', file.type);
            return;
        }

        // Validate file size - must be less than 10MB
        const maxSize = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > maxSize) {
            const fileSizeMB = (file.size / 1024 / 1024).toFixed(1);
            alert('File size must be less than 10MB.\nCurrent size: ' + fileSizeMB + 'MB');
            console.log('❌ File too large:', fileSizeMB + 'MB');
            return;
        }

        console.log('✅ File validation passed - Type:', file.type, 'Size:', (file.size / 1024 / 1024).toFixed(1) + 'MB');

        const reader = new FileReader();
        reader.onload = (e) => {
            this.loadImage(e.target.result);
        };
        reader.readAsDataURL(file);
    }

    loadImage(src) {
        const img = new Image();
        img.onload = () => {
            // Clear all existing settings
            this.clearAllSettings();

            this.originalImage = img; // Store original
            this.image = img;
            this.rotation = 0; // Reset rotation
            this.resetZoom();
            this.drawBothCanvases();
            this.updateImageInfo();
            this.enableControls();

            // Hide overlays
            document.getElementById('leftCanvasOverlay').classList.add('hidden');
            document.getElementById('rightCanvasOverlay').classList.add('hidden');
        };
        img.src = src;
    }

    // Clear all settings when loading new image
    clearAllSettings() {
        // Clear shapes
        this.shapes = [];

        // Reset calibration
        this.scale = 0;
        this.isCalibrated = false;
        this.calibrationPoints = [];

        // Reset tool selection
        this.currentTool = null;
        const dropdown = document.getElementById('detectionToolSelect');
        if (dropdown) dropdown.value = '';

        // Clear results
        this.updateResults();

        // Reset scale info display
        const scaleInfo = document.getElementById('scaleInfo');
        if (scaleInfo) {
            scaleInfo.textContent = 'Scale: Not calibrated';
            scaleInfo.style.display = 'none';
        }

        // Reset canvas instructions
        const instructions = document.getElementById('canvasInstructions');
        if (instructions) {
            instructions.textContent = 'Select a tool to start drawing';
        }

        console.log('🧹 All settings cleared for new image - Scale reset to 0, detection tools disabled');
    }

    // Draw both canvases
    drawBothCanvases() {
        this.drawLeftCanvas();
        this.drawRightCanvas();

        // Regenerate editing handles if in editing mode to follow image transforms
        // But avoid recursion during handle regeneration
        if (this.isEditingShape && !this.isRegeneratingHandles) {
            this.isRegeneratingHandles = true;
            this.generateEditingHandles();
            this.isRegeneratingHandles = false;
        }
    }

    // Draw left canvas (image + rectangles without dimensions) with rotation
    drawLeftCanvas() {
        if (!this.originalImage || !this.leftCanvas || !this.leftCtx) return;

        // Store current canvas state to prevent interference
        this.leftCtx.save();

        this.leftCtx.clearRect(0, 0, this.leftCanvas.width, this.leftCanvas.height);

        // Calculate image position and size using ORIGINAL image
        const imgAspect = this.originalImage.width / this.originalImage.height;
        const canvasAspect = this.leftCanvas.width / this.leftCanvas.height;

        let drawWidth, drawHeight;
        if (imgAspect > canvasAspect) {
            drawWidth = this.leftCanvas.width * this.zoom;
            drawHeight = drawWidth / imgAspect;
        } else {
            drawHeight = this.leftCanvas.height * this.zoom;
            drawWidth = drawHeight * imgAspect;
        }

        const x = (this.leftCanvas.width - drawWidth) / 2 + this.panX;
        const y = (this.leftCanvas.height - drawHeight) / 2 + this.panY;

        // Apply rotation transform around image center for BOTH image and shapes
        this.leftCtx.save();

        // Move to image center
        const imageCenterX = x + drawWidth / 2;
        const imageCenterY = y + drawHeight / 2;
        this.leftCtx.translate(imageCenterX, imageCenterY);

        // Rotate
        this.leftCtx.rotate((this.rotation * Math.PI) / 180);

        // Draw image centered at origin (after rotation)
        if (isFinite(drawWidth) && isFinite(drawHeight) && drawWidth > 0 && drawHeight > 0) {
            this.leftCtx.drawImage(this.originalImage, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
        }

        // Draw shapes WITHOUT dimensions (shapes will be converted from image coords to rotated canvas coords)
        this.drawShapesLeftInRotatedSpace();

        // Draw calibration points if calibrating (in rotated coordinate system)
        if (this.isCalibrating) {
            this.drawCalibrationPointsLeft();
        }

        // Draw editing handles INSIDE rotation transform (in rotated coordinate space)
        if (this.isEditingShape) {
            this.drawEditingHandles();
        }

        // Restore rotation transform
        this.leftCtx.restore();

        // Restore canvas state
        this.leftCtx.restore();
    }

    // Draw right canvas (rectangles only with dimensions) - SYNCHRONIZED with left canvas
    drawRightCanvas() {
        if (!this.rightCanvas || !this.rightCtx || !this.originalImage) return;

        // Store current canvas state
        this.rightCtx.save();

        // Clear with a subtle background
        this.rightCtx.fillStyle = '#1a1a1a';
        this.rightCtx.fillRect(0, 0, this.rightCanvas.width, this.rightCanvas.height);

        // Apply SAME rotation transform as left canvas for synchronization
        this.rightCtx.save();

        // Calculate image position and size (same as left canvas)
        const imgAspect = this.originalImage.width / this.originalImage.height;
        const canvasAspect = this.rightCanvas.width / this.rightCanvas.height;

        let drawWidth, drawHeight;
        if (imgAspect > canvasAspect) {
            drawWidth = this.rightCanvas.width * this.zoom;
            drawHeight = drawWidth / imgAspect;
        } else {
            drawHeight = this.rightCanvas.height * this.zoom;
            drawWidth = drawHeight * imgAspect;
        }

        const x = (this.rightCanvas.width - drawWidth) / 2 + this.panX;
        const y = (this.rightCanvas.height - drawHeight) / 2 + this.panY;

        // Move to image center (same as left canvas)
        const imageCenterX = x + drawWidth / 2;
        const imageCenterY = y + drawHeight / 2;
        this.rightCtx.translate(imageCenterX, imageCenterY);

        // Apply SAME rotation as left canvas
        this.rightCtx.rotate((this.rotation * Math.PI) / 180);

        // Draw shapes WITH dimensions (in rotated coordinate system)
        this.drawShapesRightInRotatedSpace();

        // Restore rotation transform
        this.rightCtx.restore();

        // Restore canvas state
        this.rightCtx.restore();
    }

    // Legacy method for compatibility - now calls drawBothCanvases
    drawImage() {
        this.drawBothCanvases();
    }

    // Draw shapes on left canvas (without dimensions)
    drawShapesLeft() {
        if (window.CanvasTools) {
            const imageInfo = this.getImageDrawInfoLeft();
            window.CanvasTools.drawShapesWithoutDimensions(this.leftCtx, this.shapes, this.zoom, this.panX, this.panY, imageInfo);
        }
    }

    // Draw shapes in rotated coordinate space (shapes stored in image coordinates)
    drawShapesLeftInRotatedSpace() {
        if (!this.originalImage || !window.CanvasTools) return;

        // Get image info for scaling
        const imageInfo = this.getImageDrawInfoLeft();
        if (!imageInfo) return;

        // Convert shapes from image coordinates to rotated canvas coordinates
        const convertedShapes = this.shapes.map(shape => {
            const convertedShape = { ...shape };

            switch (shape.type) {
                case 'rectangle':
                    // Convert image coordinates to rotated canvas coordinates
                    const topLeft = this.imageToCanvasCoordsInRotatedSpace(shape.x, shape.y, imageInfo);
                    convertedShape.x = topLeft.x;
                    convertedShape.y = topLeft.y;

                    // Scale dimensions
                    convertedShape.width = (shape.width / this.originalImage.width) * imageInfo.width;
                    convertedShape.height = (shape.height / this.originalImage.height) * imageInfo.height;
                    break;

                case 'circle':
                    // Convert center coordinates
                    const center = this.imageToCanvasCoordsInRotatedSpace(shape.centerX, shape.centerY, imageInfo);
                    convertedShape.centerX = center.x;
                    convertedShape.centerY = center.y;

                    // Scale radius
                    convertedShape.radius = (shape.radius / this.originalImage.width) * imageInfo.width;
                    break;

                case 'polygon':
                case 'detected-contour':
                    if (shape.points) {
                        convertedShape.points = shape.points.map(point =>
                            this.imageToCanvasCoordsInRotatedSpace(point.x, point.y, imageInfo)
                        );
                    }
                    break;
            }

            return convertedShape;
        });

        // Draw converted shapes (they're now in rotated canvas space, so no additional transforms needed)
        // Use black color for shape being edited
        const editingIndex = this.isEditingShape ? this.editingShapeIndex : -1;
        window.CanvasTools.drawShapesWithoutDimensionsRaw(this.leftCtx, convertedShapes, editingIndex);
    }

    // Convert image coordinates to canvas coordinates in rotated space (relative to rotated image center)
    imageToCanvasCoordsInRotatedSpace(imageX, imageY, imageInfo) {
        // Convert from image coordinates to scaled coordinates relative to image center
        const relativeX = (imageX / this.originalImage.width - 0.5) * imageInfo.width;
        const relativeY = (imageY / this.originalImage.height - 0.5) * imageInfo.height;

        return { x: relativeX, y: relativeY };
    }

    // Draw shapes on right canvas (with dimensions)
    drawShapesRight() {
        if (window.CanvasTools) {
            const imageInfo = this.getImageDrawInfoRight();
            window.CanvasTools.drawShapesWithDimensions(this.rightCtx, this.shapes, this.zoom, this.panX, this.panY, imageInfo);
        }
    }

    // Draw shapes in rotated coordinate space for right canvas (with dimensions)
    drawShapesRightInRotatedSpace() {
        if (!this.originalImage || !window.CanvasTools) return;

        // Get image info for scaling (use right canvas info)
        const imageInfo = this.getImageDrawInfoRight();
        if (!imageInfo) return;

        // Convert shapes from image coordinates to rotated canvas coordinates
        const convertedShapes = this.shapes.map(shape => {
            const convertedShape = { ...shape };

            switch (shape.type) {
                case 'rectangle':
                    // Convert image coordinates to rotated canvas coordinates
                    const topLeft = this.imageToCanvasCoordsInRotatedSpace(shape.x, shape.y, imageInfo);
                    convertedShape.x = topLeft.x;
                    convertedShape.y = topLeft.y;

                    // Scale dimensions
                    convertedShape.width = (shape.width / this.originalImage.width) * imageInfo.width;
                    convertedShape.height = (shape.height / this.originalImage.height) * imageInfo.height;
                    break;

                case 'circle':
                    // Convert center coordinates
                    const center = this.imageToCanvasCoordsInRotatedSpace(shape.centerX, shape.centerY, imageInfo);
                    convertedShape.centerX = center.x;
                    convertedShape.centerY = center.y;

                    // Scale radius
                    convertedShape.radius = (shape.radius / this.originalImage.width) * imageInfo.width;
                    break;

                case 'polygon':
                case 'detected-contour':
                    if (shape.points) {
                        convertedShape.points = shape.points.map(point =>
                            this.imageToCanvasCoordsInRotatedSpace(point.x, point.y, imageInfo)
                        );
                    }
                    break;
            }

            return convertedShape;
        });

        // Draw converted shapes WITH dimensions (they're now in rotated canvas space)
        window.CanvasTools.drawShapesWithDimensionsRaw(this.rightCtx, convertedShapes, this.scale);
    }

    // Legacy method for compatibility
    drawShapes() {
        this.drawShapesLeft();
    }

    getImageDrawInfoLeft() {
        if (!this.originalImage) return null;

        const canvasWidth = this.leftCanvas.width;
        const canvasHeight = this.leftCanvas.height;

        // Calculate scaled dimensions using ORIGINAL image
        const scaledWidth = this.originalImage.width * this.zoom;
        const scaledHeight = this.originalImage.height * this.zoom;

        // Calculate position (centered + pan offset)
        const x = (canvasWidth - scaledWidth) / 2 + this.panX;
        const y = (canvasHeight - scaledHeight) / 2 + this.panY;

        return {
            x: x,
            y: y,
            width: scaledWidth,
            height: scaledHeight,
            originalWidth: this.originalImage.width,
            originalHeight: this.originalImage.height,
            rotation: this.rotation // Include rotation info
        };
    }

    getImageDrawInfoRight() {
        if (!this.originalImage) return null;

        const canvasWidth = this.rightCanvas.width;
        const canvasHeight = this.rightCanvas.height;

        // Calculate scaled dimensions (same as left for synchronization) using ORIGINAL image
        const scaledWidth = this.originalImage.width * this.zoom;
        const scaledHeight = this.originalImage.height * this.zoom;

        // Calculate position (centered + pan offset)
        const x = (canvasWidth - scaledWidth) / 2 + this.panX;
        const y = (canvasHeight - scaledHeight) / 2 + this.panY;

        return {
            x: x,
            y: y,
            width: scaledWidth,
            height: scaledHeight,
            originalWidth: this.originalImage.width,
            originalHeight: this.originalImage.height,
            rotation: this.rotation // Include rotation info
        };
    }

    // Legacy method for compatibility
    getImageDrawInfo() {
        return this.getImageDrawInfoLeft();
    }

    drawCalibrationPointsLeft() {
        if (!this.originalImage) return;

        this.leftCtx.fillStyle = 'red';
        this.leftCtx.strokeStyle = 'red';
        this.leftCtx.lineWidth = 2;
        this.leftCtx.font = '12px Arial';

        const imageInfo = this.getImageDrawInfoLeft();
        if (!imageInfo) return;

        // Convert calibration points from image coordinates to rotated canvas coordinates
        const canvasPoints = this.calibrationPoints.map((point, index) => {
            const canvasCoords = this.imageToCanvasCoordsInRotatedSpace(point.x, point.y, imageInfo);

            console.log(`📍 Calibration point ${index + 1}: Image (${point.x.toFixed(1)}, ${point.y.toFixed(1)}) → Canvas (${canvasCoords.x.toFixed(1)}, ${canvasCoords.y.toFixed(1)})`);

            return canvasCoords;
        });

        // Draw calibration points at converted coordinates
        canvasPoints.forEach((canvasPoint, index) => {
            this.leftCtx.beginPath();
            this.leftCtx.arc(canvasPoint.x, canvasPoint.y, 5, 0, 2 * Math.PI);
            this.leftCtx.fill();

            this.leftCtx.fillText(`P${index + 1}`, canvasPoint.x + 10, canvasPoint.y - 10);
        });

        // Draw line between points if we have 2
        if (canvasPoints.length === 2) {
            this.leftCtx.beginPath();
            this.leftCtx.moveTo(canvasPoints[0].x, canvasPoints[0].y);
            this.leftCtx.lineTo(canvasPoints[1].x, canvasPoints[1].y);
            this.leftCtx.stroke();
        }
    }

    // Legacy method for compatibility
    drawCalibrationPoints() {
        this.drawCalibrationPointsLeft();
    }

    updateImageInfo() {
        const headerInfo = document.getElementById('imageInfoHeader').querySelector('.image-info-text');
        if (this.image) {
            const scaleText = this.scale > 0 ? `Scale: ${(1/this.scale).toFixed(2)} px/mm` : 'Scale: Not set';
            headerInfo.textContent = `Image: ${this.image.width}×${this.image.height} | ${scaleText}`;
        } else {
            headerInfo.textContent = 'No image loaded';
        }
    }

    enableControls() {
        const buttons = [
            'calibrateBtn', 'zoomInBtn', 'zoomOutBtn', 'resetZoomBtn', 'detailViewBtn',
            'rotateLeftBtn', 'rotateRightBtn',
            'exportDataBtn', 'exportImageBtn'
        ];

        buttons.forEach(id => {
            document.getElementById(id).disabled = false;
        });

        // Detection tools disabled when image loads - enabled only after calibration
        const detectionToolSelect = document.getElementById('detectionToolSelect');
        if (detectionToolSelect) {
            detectionToolSelect.disabled = true;
            detectionToolSelect.value = '';
        }
    }

    // Enable/disable detection tools based on scale status
    updateDetectionToolsState() {
        const detectionToolSelect = document.getElementById('detectionToolSelect');
        const isScaleSet = this.scale > 0;

        if (detectionToolSelect) {
            detectionToolSelect.disabled = !isScaleSet;

            if (isScaleSet) {
                // Set default to rectangle when enabled
                detectionToolSelect.value = 'rectangle';
                this.setTool('rectangle');
                console.log('🔧 Detection tools ENABLED - Scale is set');
            } else {
                detectionToolSelect.value = '';
                this.setTool(null);
                console.log('🔒 Detection tools DISABLED - Scale not set');
            }
        }
    }

    // Mouse event handlers
    handleMouseDown(e) {
        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (e.button === 2) { // Right mouse button
            // Start panning
            this.isPanning = true;
            this.lastPanX = e.clientX;
            this.lastPanY = e.clientY;
            e.preventDefault();
            return;
        }

        // Left mouse button (button === 0)
        if (this.isEditingShape) {
            // Check if clicking on editing handle
            this.handleEditingMouseDown(x, y);
        } else if (this.isCalibrating) {
            this.addCalibrationPoint(x, y);
        } else if (this.currentTool) {
            // Tool-specific mouse handling will be in canvas-tools.js
            if (window.CanvasTools) {
                window.CanvasTools.handleMouseDown(x, y, this.currentTool, this);
            }
        }
    }

    handleMouseMove(e) {
        if (this.isPanning) {
            // Pan the canvas
            const deltaX = e.clientX - this.lastPanX;
            const deltaY = e.clientY - this.lastPanY;

            this.panX += deltaX;
            this.panY += deltaY;

            this.lastPanX = e.clientX;
            this.lastPanY = e.clientY;

            this.drawBothCanvases();
            return;
        }

        const rect = e.target.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        if (this.isEditingShape && this.dragHandle) {
            this.handleEditingMouseMove(x, y);
            return;
        }

        // Check if hovering over a handle to change cursor
        if (this.isEditingShape) {
            const rotatedMouse = this.convertMouseToRotatedSpace(x, y);
            let resizeCursor = 'default';

            for (let i = 0; i < this.editingHandles.length; i++) {
                const handle = this.editingHandles[i];
                const distance = Math.sqrt(Math.pow(rotatedMouse.x - handle.x, 2) + Math.pow(rotatedMouse.y - handle.y, 2));

                if (distance <= 8) {
                    // Set appropriate resize cursor based on handle position
                    resizeCursor = this.getResizeCursor(handle.position);
                    break;
                }
            }

            this.leftCanvas.style.cursor = resizeCursor;
        }

        if (this.currentTool && window.CanvasTools) {
            window.CanvasTools.handleMouseMove(x, y, this.currentTool, this);
        }
    }

    handleMouseUp(e) {
        if (e.button === 2) { // Right mouse button
            this.isPanning = false;
            return;
        }

        if (this.isEditingShape && this.dragHandle) {
            this.handleEditingMouseUp();
            return;
        }

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
            // Convert canvas coordinates to image coordinates (rotation-aware)
            const imageCoords = this.canvasToImageCoords(x, y);

            console.log(`📏 Calibration point ${this.calibrationPoints.length + 1}: Canvas (${x}, ${y}) → Image (${imageCoords.x.toFixed(1)}, ${imageCoords.y.toFixed(1)})`);

            this.calibrationPoints.push({
                x: imageCoords.x,
                y: imageCoords.y,
                canvasX: x,  // Store original canvas coords for display
                canvasY: y
            });

            this.drawBothCanvases();

            if (this.calibrationPoints.length === 2) {
                document.getElementById('calibrationInput').style.display = 'block';
                document.getElementById('canvasInstructions').textContent = 'Enter the real measurement';

                // Enable input field and auto-focus
                setTimeout(() => {
                    const realMeasurementInput = document.getElementById('realMeasurement');
                    realMeasurementInput.disabled = false; // Enable input
                    realMeasurementInput.focus();
                    realMeasurementInput.select(); // Select any existing text

                    // Setup real-time validation for submit button
                    this.setupMeasurementValidation();
                }, 100);
            }
        }
    }

    // Setup real-time validation for measurement input
    setupMeasurementValidation() {
        const realMeasurementInput = document.getElementById('realMeasurement');
        const confirmButton = document.getElementById('confirmCalibration');

        const validateInput = () => {
            const value = realMeasurementInput.value.trim();
            const isValid = value !== '' && !isNaN(value) && parseFloat(value) > 0;

            confirmButton.disabled = !isValid;

            if (isValid) {
                console.log('✅ Valid measurement entered:', value);
            } else {
                console.log('❌ Invalid measurement:', value || '(empty)');
            }
        };

        // Validate on input change
        realMeasurementInput.addEventListener('input', validateInput);
        realMeasurementInput.addEventListener('keyup', validateInput);

        // Initial validation
        validateInput();
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
        document.getElementById('realMeasurement').disabled = true; // Disable input after success
        document.getElementById('confirmCalibration').disabled = true; // Disable submit button
        document.getElementById('calibrateBtn').textContent = 'Set Scale';
        document.getElementById('calibrateBtn').disabled = false;
        document.getElementById('canvasInstructions').textContent = 'Scale calibrated successfully';
        
        this.updateScaleInfo();
        this.updateImageInfo();
        this.updateDetectionToolsState(); // Enable detection tools now that scale is set
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

        // Update dropdown selection
        const dropdown = document.getElementById('detectionToolSelect');
        dropdown.value = tool;

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
        const deleteAllBtn = document.getElementById('deleteAllResultsBtn');

        if (this.shapes.length === 0) {
            resultsArea.innerHTML = '<p class="no-results">No measurements yet</p>';
            deleteAllBtn.style.display = 'none';
            return;
        }

        // Show delete all button when there are shapes
        deleteAllBtn.style.display = 'inline-block';

        let html = '';
        // Display shapes in reverse order (newest first) but keep original numbering
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const shape = this.shapes[i];
            const index = i;
            const area = this.calculateShapeArea(shape);
            const details = this.calculateDetailedMeasurements(shape);
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

            // Format detailed calculations
            const lengthBreakdown = details.lengths.length > 0 ?
                details.lengths.map(l => l.toFixed(1)).join(' + ') + ' = ' + details.lengths.reduce((sum, l) => sum + l, 0).toFixed(1) :
                '0';

            const widthBreakdown = details.widths.length > 0 ?
                details.widths.map(w => w.toFixed(1)).join(' + ') + ' = ' + details.widths.reduce((sum, w) => sum + w, 0).toFixed(1) :
                '0';

            // Check if this shape is currently being edited
            const isCurrentlyEditing = this.isEditingShape && this.editingShapeIndex === index;
            const shapeTitle = isCurrentlyEditing ?
                `${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)} (editing...)` :
                `${shape.type.charAt(0).toUpperCase() + shape.type.slice(1)}`;

            html += `
                <div class="result-item ${shapeClass}" data-shape-index="${index}" ondblclick="window.app.startEditingShape(${index})" title="Double-click to edit">
                    <div class="result-header">
                        <span class="shape-number" style="background-color: ${shapeColor};">${shapeNumber}</span>
                        <h4>${shapeTitle}</h4>
                        <button class="delete-shape-btn" data-shape-index="${index}" title="Delete this shape">🗑️</button>
                    </div>
                    <div class="result-details">
                        <div class="measurement-breakdown">
                            <p><strong>Length:</strong> ${lengthBreakdown} mm</p>
                            <p><strong>Width:</strong> ${widthBreakdown} mm</p>
                        </div>
                    </div>
                </div>
            `;
        }

        // Add summary calculations
        if (this.shapes.length > 0) {
            const totalLengths = [];
            const totalWidths = [];
            const totalAreas = [];

            this.shapes.forEach(shape => {
                const details = this.calculateDetailedMeasurements(shape);
                totalLengths.push(...details.lengths);
                totalWidths.push(...details.widths);
                totalAreas.push(details.area);
            });

            const lengthSum = totalLengths.reduce((sum, l) => sum + l, 0);
            const widthSum = totalWidths.reduce((sum, w) => sum + w, 0);
            const areaSum = totalAreas.reduce((sum, a) => sum + a, 0);

            const lengthBreakdown = totalLengths.length > 0 ?
                totalLengths.map(l => l.toFixed(1)).join(' + ') + ' = ' + lengthSum.toFixed(1) : '0';

            const widthBreakdown = totalWidths.length > 0 ?
                totalWidths.map(w => w.toFixed(1)).join(' + ') + ' = ' + widthSum.toFixed(1) : '0';

            const areaBreakdown = totalAreas.length > 0 ?
                totalAreas.map(a => a.toFixed(1)).join(' + ') + ' = ' + areaSum.toFixed(1) : '0';


        }

        resultsArea.innerHTML = html;

        // Add hover effects to highlight shapes
        this.setupResultHoverEffects();
    }

    setupResultHoverEffects() {
        const resultItems = document.querySelectorAll('.result-item');
        const deleteButtons = document.querySelectorAll('.delete-shape-btn');

        // Simple, clean event handling - let CSS handle the isolation
        resultItems.forEach((item, index) => {
            item.addEventListener('mouseenter', () => {
                this.highlightShape(index, true);
            });

            item.addEventListener('mouseleave', () => {
                this.highlightShape(index, false);
            });

            // Double-click handled inline in result-item markup to start editing
            // (Focus behavior removed to prevent unexpected pan/zoom on edit)

            item.addEventListener('click', (e) => {
                // Don't select if clicking on delete button
                if (!e.target.classList.contains('delete-shape-btn')) {
                    this.selectShape(index);
                }
            });
        });

        // Handle delete button clicks
        deleteButtons.forEach((button) => {
            button.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering result item click
                const shapeIndex = parseInt(button.dataset.shapeIndex);
                this.deleteShape(shapeIndex);
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

    // Calculate detailed measurements for a shape
    calculateDetailedMeasurements(shape) {
        const details = {
            lengths: [],
            widths: [],
            area: 0,
            perimeter: 0
        };

        switch (shape.type) {
            case 'rectangle':
                const width = shape.width / this.scale;
                const height = shape.height / this.scale;
                details.lengths = [width]; // Single side length only
                details.widths = [height]; // Single side width only
                details.area = width * height;
                details.perimeter = 2 * (width + height);
                break;

            case 'circle':
                const radius = shape.radius / this.scale;
                const diameter = 2 * radius;
                details.lengths = [diameter]; // Diameter as length
                details.widths = [diameter]; // Diameter as width
                details.area = Math.PI * radius * radius;
                details.perimeter = 2 * Math.PI * radius;
                break;

            case 'polygon':
            case 'detected-contour':
                if (shape.points && shape.points.length >= 3) {
                    // Calculate all edge lengths
                    const edgeLengths = [];
                    for (let i = 0; i < shape.points.length; i++) {
                        const current = shape.points[i];
                        const next = shape.points[(i + 1) % shape.points.length];
                        const length = Math.sqrt(
                            Math.pow(next.x - current.x, 2) +
                            Math.pow(next.y - current.y, 2)
                        ) / this.scale;
                        edgeLengths.push(length);
                    }

                    // For polygons, separate into lengths and widths based on orientation
                    // This is a simplified approach - could be enhanced for complex shapes
                    details.lengths = edgeLengths.filter((_, index) => index % 2 === 0);
                    details.widths = edgeLengths.filter((_, index) => index % 2 === 1);

                    details.perimeter = edgeLengths.reduce((sum, length) => sum + length, 0);
                    details.area = this.calculateShapeArea(shape);
                }
                break;
        }

        return details;
    }

    calculateShapePerimeter(shape) {
        if (window.Calculator) {
            return window.Calculator.calculatePerimeter(shape, this.scale);
        }
        return 0;
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
        const exportCanvas = this.rightCanvas || this.canvas;
        link.href = exportCanvas.toDataURL();
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
            this.scale = 0;
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

            // Show overlays
            document.getElementById('leftCanvasOverlay').classList.remove('hidden');
            document.getElementById('rightCanvasOverlay').classList.remove('hidden');

            // Disable controls
            const buttons = [
                'calibrateBtn', 'zoomInBtn', 'zoomOutBtn', 'resetZoomBtn', 'detailViewBtn',
                'rotateLeftBtn', 'rotateRightBtn',
                'exportDataBtn', 'exportImageBtn'
            ];

            buttons.forEach(id => {
                document.getElementById(id).disabled = true;
            });

            // Disable detection tool dropdown
            document.getElementById('detectionToolSelect').disabled = true;

            console.log('New project started');
        }
    }

    // Image Rotation Method - Shapes stick to image like stickers
    rotateImage(degrees) {
        if (!this.originalImage) return;

        this.rotation = (this.rotation + degrees) % 360;
        if (this.rotation < 0) this.rotation += 360;

        console.log(`🔄 Rotating view ${degrees}° - Total rotation: ${this.rotation}°`);
        console.log(`📍 Shapes stored in image coordinates - they stick like stickers`);

        // Shapes are stored in image coordinates, so they automatically stick to image
        // Just redraw with new rotation
        this.drawBothCanvases();
    }

    // Convert canvas coordinates to image coordinates (for storing shapes)
    canvasToImageCoords(canvasX, canvasY) {
        if (!this.originalImage) return { x: canvasX, y: canvasY };

        const imageInfo = this.getImageDrawInfoLeft();
        if (!imageInfo) return { x: canvasX, y: canvasY };

        // The click is on the rotated canvas, but we need to find where it would be
        // in the original (non-rotated) image coordinates

        // First, get the image center in canvas coordinates
        const imageCenterX = imageInfo.x + imageInfo.width / 2;
        const imageCenterY = imageInfo.y + imageInfo.height / 2;

        // Convert click to relative coordinates from image center
        let relativeX = canvasX - imageCenterX;
        let relativeY = canvasY - imageCenterY;

        // Reverse the rotation to get the position in the original image space
        const angle = (-this.rotation * Math.PI) / 180; // Negative to reverse rotation
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const unrotatedX = relativeX * cos - relativeY * sin;
        const unrotatedY = relativeX * sin + relativeY * cos;

        // Convert from scaled canvas coordinates to original image coordinates
        const imageX = ((unrotatedX + imageInfo.width / 2) / imageInfo.width) * this.originalImage.width;
        const imageY = ((unrotatedY + imageInfo.height / 2) / imageInfo.height) * this.originalImage.height;

        console.log(`🖱️ Click (${canvasX}, ${canvasY}) → Image (${imageX.toFixed(1)}, ${imageY.toFixed(1)}) [Rotation: ${this.rotation}°]`);

        return { x: imageX, y: imageY };
    }

    // Convert image coordinates to canvas coordinates (for displaying shapes)
    imageToCanvasCoords(imageX, imageY) {
        if (!this.originalImage) return { x: imageX, y: imageY };

        const imageInfo = this.getImageDrawInfoLeft();
        if (!imageInfo) return { x: imageX, y: imageY };

        // Convert from image coordinates to scaled coordinates
        const scaledX = (imageX / this.originalImage.width) * imageInfo.width;
        const scaledY = (imageY / this.originalImage.height) * imageInfo.height;

        // Center relative coordinates
        const relativeX = scaledX - imageInfo.width / 2;
        const relativeY = scaledY - imageInfo.height / 2;

        // Apply rotation
        const angle = (this.imageRotation * Math.PI) / 180;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);

        const rotatedX = relativeX * cos - relativeY * sin;
        const rotatedY = relativeX * sin + relativeY * cos;

        // Translate back to canvas coordinates
        const imageCenterX = imageInfo.x + imageInfo.width / 2;
        const imageCenterY = imageInfo.y + imageInfo.height / 2;

        return {
            x: rotatedX + imageCenterX,
            y: rotatedY + imageCenterY
        };
    }





    // Delete Shape Method
    deleteShape(shapeIndex) {
        if (shapeIndex < 0 || shapeIndex >= this.shapes.length) return;

        const shapeType = this.shapes[shapeIndex].type;
        const shapeNumber = shapeIndex + 1;

        if (confirm(`Delete ${shapeType} #${shapeNumber}?`)) {
            // Remove the shape from the array
            this.shapes.splice(shapeIndex, 1);

            // Clear any selection
            this.clearShapeSelection();

            // Redraw and update
            this.drawImage();
            this.updateResults();

            console.log(`Deleted ${shapeType} #${shapeNumber}`);
        }
    }

    // Shape Editing Methods
    startEditingShape(shapeIndex) {
        if (shapeIndex < 0 || shapeIndex >= this.shapes.length) return;
        if (this.shapes[shapeIndex].type !== 'rectangle') {
            console.log('⚠️ Only rectangles can be edited currently');
            return;
        }

        console.log(`✏️ Starting to edit rectangle #${shapeIndex + 1}`);

        this.isEditingShape = true;
        this.editingShapeIndex = shapeIndex;
        this.originalShape = JSON.parse(JSON.stringify(this.shapes[shapeIndex])); // Deep copy

        // Generate editing handles
        this.generateEditingHandles();

        // Show editing indicator
        this.showEditingIndicator(true, shapeIndex + 1);

        // Show editing info bar
        this.showEditingInfoBar(true);

        // Update results to show "(editing...)" status
        this.updateResults();

        // Redraw with editing handles
        this.drawBothCanvases();
    }

    generateEditingHandles() {
        const shape = this.shapes[this.editingShapeIndex];
        if (!shape || shape.type !== 'rectangle') return;

        // Get image info for coordinate conversion
        const imageInfo = this.getImageDrawInfoLeft();
        if (!imageInfo) return;

        // Convert shape corners from image coordinates to rotated canvas coordinates (same as shapes)
        const topLeft = this.imageToCanvasCoordsInRotatedSpace(shape.x, shape.y, imageInfo);
        const topRight = this.imageToCanvasCoordsInRotatedSpace(shape.x + shape.width, shape.y, imageInfo);
        const bottomLeft = this.imageToCanvasCoordsInRotatedSpace(shape.x, shape.y + shape.height, imageInfo);
        const bottomRight = this.imageToCanvasCoordsInRotatedSpace(shape.x + shape.width, shape.y + shape.height, imageInfo);

        // Calculate edge midpoints
        const topMid = {
            x: (topLeft.x + topRight.x) / 2,
            y: (topLeft.y + topRight.y) / 2
        };
        const bottomMid = {
            x: (bottomLeft.x + bottomRight.x) / 2,
            y: (bottomLeft.y + bottomRight.y) / 2
        };
        const leftMid = {
            x: (topLeft.x + bottomLeft.x) / 2,
            y: (topLeft.y + bottomLeft.y) / 2
        };
        const rightMid = {
            x: (topRight.x + bottomRight.x) / 2,
            y: (topRight.y + bottomRight.y) / 2
        };

        this.editingHandles = [
            // Corner handles
            { type: 'corner', position: 'top-left', x: topLeft.x, y: topLeft.y },
            { type: 'corner', position: 'top-right', x: topRight.x, y: topRight.y },
            { type: 'corner', position: 'bottom-left', x: bottomLeft.x, y: bottomLeft.y },
            { type: 'corner', position: 'bottom-right', x: bottomRight.x, y: bottomRight.y },

            // Edge handles
            { type: 'edge', position: 'top', x: topMid.x, y: topMid.y },
            { type: 'edge', position: 'bottom', x: bottomMid.x, y: bottomMid.y },
            { type: 'edge', position: 'left', x: leftMid.x, y: leftMid.y },
            { type: 'edge', position: 'right', x: rightMid.x, y: rightMid.y }
        ];

        console.log('🎯 Generated editing handles with rotation:', this.editingHandles.length, 'rotation:', this.imageRotation + '°');
        console.log('Handle positions:', this.editingHandles.map(h => `${h.position}: (${h.x.toFixed(1)}, ${h.y.toFixed(1)})`));
    }

    showEditingIndicator(show, shapeNumber = null) {
        const indicator = document.getElementById('editingIndicator');
        if (indicator) {
            if (show && shapeNumber) {
                indicator.style.display = 'block';
                indicator.querySelector('.editing-text').textContent = `✏️ Editing Rectangle ${shapeNumber}...`;
            } else {
                indicator.style.display = 'none';
            }
        }
    }

    showEditingInfoBar(show) {
        const infoBar = document.getElementById('editingInfoBar');
        if (infoBar) {
            infoBar.style.display = show ? 'block' : 'none';
        }
    }

    cancelShapeEditing() {
        if (!this.isEditingShape) return;

        console.log('❌ Cancelled shape editing');

        // Show cancellation message
        this.showConfirmationMessage('❌ Changes cancelled - reverted to original size');

        // Restore original shape
        this.shapes[this.editingShapeIndex] = this.originalShape;

        // Reset editing state
        this.isEditingShape = false;
        this.editingShapeIndex = -1;
        this.originalShape = null;
        this.editingHandles = [];
        this.dragHandle = null;

        // Hide editing indicator and info bar
        this.showEditingIndicator(false);
        this.showEditingInfoBar(false);

        // Redraw
        this.drawBothCanvases();
        this.updateResults();
    }

    finishShapeEditing() {
        if (!this.isEditingShape) return;

        console.log('✅ Finished shape editing - changes accepted');

        // Show confirmation message briefly
        this.showConfirmationMessage('✅ Rectangle size confirmed!');

        // Reset editing state (keep the modified shape)
        this.isEditingShape = false;
        this.editingShapeIndex = -1;
        this.originalShape = null;
        this.editingHandles = [];
        this.dragHandle = null;

        // Hide editing indicator and info bar
        this.showEditingIndicator(false);
        this.showEditingInfoBar(false);

        // Redraw and update results
        this.drawBothCanvases();
        this.updateResults();
    }

    // Get appropriate resize cursor for handle position
    getResizeCursor(handlePosition) {
        // Map handle positions to CSS cursor values
        const cursorMap = {
            'top-left': 'nw-resize',
            'top-right': 'ne-resize',
            'bottom-left': 'sw-resize',
            'bottom-right': 'se-resize',
            'top': 'n-resize',
            'bottom': 's-resize',
            'left': 'w-resize',
            'right': 'e-resize'
        };

        return cursorMap[handlePosition] || 'default';
    }

    // Convert mouse coordinates to rotated coordinate space (to match handle positions)
    convertMouseToRotatedSpace(mouseX, mouseY) {
        const imageInfo = this.getImageDrawInfoLeft();
        if (!imageInfo) return { x: mouseX, y: mouseY };

        // Convert mouse coordinates to the same coordinate system as handles
        // Handles are positioned using imageToCanvasCoordsInRotatedSpace
        // So we need to convert mouse to that same space

        // First convert mouse to image coordinates
        const imageCoords = this.canvasToImageCoords(mouseX, mouseY);

        // Then convert back to rotated canvas coordinates (same as handles)
        const rotatedCoords = this.imageToCanvasCoordsInRotatedSpace(imageCoords.x, imageCoords.y, imageInfo);

        return rotatedCoords;
    }

    // Editing mouse handlers
    handleEditingMouseDown(x, y) {
        console.log(`🖱️ Mouse down at canvas (${x.toFixed(1)}, ${y.toFixed(1)})`);

        // Convert mouse coordinates to rotated space to match handle coordinates
        const rotatedMouse = this.convertMouseToRotatedSpace(x, y);
        console.log(`🔄 Converted to rotated space: (${rotatedMouse.x.toFixed(1)}, ${rotatedMouse.y.toFixed(1)})`);

        // Check if clicking on a handle
        for (let i = 0; i < this.editingHandles.length; i++) {
            const handle = this.editingHandles[i];
            const distance = Math.sqrt(Math.pow(rotatedMouse.x - handle.x, 2) + Math.pow(rotatedMouse.y - handle.y, 2));
            console.log(`📏 Distance to ${handle.position} handle: ${distance.toFixed(1)}px (handle at ${handle.x.toFixed(1)}, ${handle.y.toFixed(1)})`);

            if (distance <= 8) { // 8px tolerance
                this.dragHandle = handle;
                console.log(`🎯 Started dragging ${handle.type} handle: ${handle.position}`);

                // Set cursor to appropriate resize cursor during drag
                this.leftCanvas.style.cursor = this.getResizeCursor(handle.position);

                this.drawBothCanvases(); // Redraw to show active handle
                return;
            }
        }

        console.log('❌ No handle clicked');
        // If not clicking on handle, do nothing (keep editing mode active)
        // User must press ESC to exit editing mode
    }

    handleEditingMouseMove(x, y) {
        if (!this.dragHandle) return;

        const shape = this.shapes[this.editingShapeIndex];
        if (!shape || shape.type !== 'rectangle') return;

        // Convert canvas coordinates to image coordinates
        const imageCoords = this.canvasToImageCoords(x, y);

        // Update shape based on handle type and position
        this.updateShapeFromHandle(shape, this.dragHandle, imageCoords);

        // Regenerate handles for new shape position
        this.generateEditingHandles();

        // Redraw with black color during editing
        this.drawBothCanvases();
    }

    handleEditingMouseUp() {
        if (this.dragHandle) {
            console.log(`✅ Finished dragging ${this.dragHandle.type} handle`);
            this.dragHandle = null;

            // Reset cursor to default
            this.leftCanvas.style.cursor = 'default';

            // Stay in editing mode - user must press ESC to exit
            // Regenerate handles in case shape changed significantly
            this.generateEditingHandles();
            this.drawBothCanvases();
        }
    }

    updateShapeFromHandle(shape, handle, newPos) {
        const originalLeft = shape.x;
        const originalTop = shape.y;
        const originalRight = shape.x + shape.width;
        const originalBottom = shape.y + shape.height;

        let newLeft = originalLeft;
        let newTop = originalTop;
        let newRight = originalRight;
        let newBottom = originalBottom;

        // Update bounds based on handle position
        switch (handle.position) {
            case 'top-left':
                newLeft = newPos.x;
                newTop = newPos.y;
                break;
            case 'top-right':
                newRight = newPos.x;
                newTop = newPos.y;
                break;
            case 'bottom-left':
                newLeft = newPos.x;
                newBottom = newPos.y;
                break;
            case 'bottom-right':
                newRight = newPos.x;
                newBottom = newPos.y;
                break;
            case 'top':
                newTop = newPos.y;
                break;
            case 'bottom':
                newBottom = newPos.y;
                break;
            case 'left':
                newLeft = newPos.x;
                break;
            case 'right':
                newRight = newPos.x;
                break;
        }

        // Ensure minimum size and correct order
        if (newLeft > newRight) [newLeft, newRight] = [newRight, newLeft];
        if (newTop > newBottom) [newTop, newBottom] = [newBottom, newTop];

        const minSize = 10; // Minimum 10 pixels in image coordinates
        if (newRight - newLeft < minSize) {
            const center = (newLeft + newRight) / 2;
            newLeft = center - minSize / 2;
            newRight = center + minSize / 2;
        }
        if (newBottom - newTop < minSize) {
            const center = (newTop + newBottom) / 2;
            newTop = center - minSize / 2;
            newBottom = center + minSize / 2;
        }

        // Update shape
        shape.x = newLeft;
        shape.y = newTop;
        shape.width = newRight - newLeft;
        shape.height = newBottom - newTop;
    }

    // Draw editing handles
    drawEditingHandles() {
        if (!this.isEditingShape || this.editingHandles.length === 0) {
            console.log('⚠️ No editing handles to draw');
            return;
        }

        this.leftCtx.save();

        console.log('🎨 Drawing', this.editingHandles.length, 'editing handles');

        // Draw handles with better visibility
        this.editingHandles.forEach((handle, index) => {
            const size = handle.type === 'corner' ? 10 : 8; // Make handles bigger
            const isActive = this.dragHandle && this.dragHandle === handle;

            // Draw background - yellow if active, white if not
            this.leftCtx.fillStyle = isActive ? '#ffff00' : '#ffffff';
            this.leftCtx.fillRect(handle.x - size/2, handle.y - size/2, size, size);

            // Draw border - red if active, blue if not
            this.leftCtx.strokeStyle = isActive ? '#ff0000' : '#007acc';
            this.leftCtx.lineWidth = isActive ? 3 : 2;
            this.leftCtx.strokeRect(handle.x - size/2, handle.y - size/2, size, size);

            console.log(`Handle ${index}: ${handle.position} at (${handle.x.toFixed(1)}, ${handle.y.toFixed(1)}) ${isActive ? '[ACTIVE]' : ''}`);
        });

        // Draw editing instructions in top-right corner
        const instructionWidth = 250;
        const instructionHeight = 70;
        const margin = 10;
        const x = this.leftCanvas.width - instructionWidth - margin;
        const y = margin;

        this.leftCtx.fillStyle = 'rgba(0, 120, 215, 0.9)'; // Blue background
        this.leftCtx.fillRect(x, y, instructionWidth, instructionHeight);

        // White border
        this.leftCtx.strokeStyle = '#ffffff';
        this.leftCtx.lineWidth = 2;
        this.leftCtx.strokeRect(x, y, instructionWidth, instructionHeight);

        this.leftCtx.fillStyle = '#ffffff';
        this.leftCtx.font = 'bold 14px Arial';
        this.leftCtx.fillText('🔧 EDITING MODE', x + 5, y + 20);

        this.leftCtx.font = '12px Arial';
        this.leftCtx.fillText('• Drag white squares to resize', x + 5, y + 35);
        this.leftCtx.fillText('• Press ENTER to confirm size', x + 5, y + 48);
        this.leftCtx.fillText('• Press ESC to cancel changes', x + 5, y + 61);

        this.leftCtx.restore();
    }

    showConfirmationMessage(message) {
        // Create temporary overlay
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 150, 0, 0.9);
            color: white;
            padding: 15px 25px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: bold;
            z-index: 1000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        overlay.textContent = message;
        document.body.appendChild(overlay);

        // Remove after 2 seconds
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.parentNode.removeChild(overlay);
            }
        }, 2000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new ImageAnalysisApp();
});
