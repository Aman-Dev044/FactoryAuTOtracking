import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  LuCamera as HiOutlineCamera,
  LuUpload as HiOutlineUpload,
  LuSparkles as HiOutlineSparkles,
  LuX as HiOutlineX,
  LuRefreshCw as HiOutlineRefresh,
  LuCircleCheckBig as HiOutlineCheckCircle,
  LuFileText as HiOutlineDocumentText,
  LuZap as HiOutlineLightningBolt,
  LuArrowLeftRight as HiOutlineSwitchHorizontal,
  LuTruck as HiOutlineTruck,
  LuUser as HiOutlineUser,
  LuBuilding2 as HiOutlineOfficeBuilding,
  LuBoxes as HiOutlineCube,
  LuHash as HiOutlineHashtag,
  LuCheck as HiOutlineCheck,
} from 'react-icons/lu';
import { gateEntryAPI } from '../../services/api';
import toast from 'react-hot-toast';

const WebcamEBillScanner = ({ isOpen, onClose, onScanComplete }) => {
  const [activeTab, setActiveTab] = useState('upload'); // default to 'upload' or 'webcam'
  
  // Webcam state
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [devices, setDevices] = useState([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState('');
  const [capturedImage, setCapturedImage] = useState(null);
  
  // File Upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [lastMatchedPO, setLastMatchedPO] = useState(null);
  const [lastInvoiceUrl, setLastInvoiceUrl] = useState('');

  // Initialize and list video devices
  const getVideoDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoInputs = allDevices.filter(d => d.kind === 'videoinput');
      setDevices(videoInputs);
      if (videoInputs.length > 0 && !selectedDeviceId) {
        // Prefer back camera / environment if present
        const backCam = videoInputs.find(d => d.label.toLowerCase().includes('back') || d.label.toLowerCase().includes('environment'));
        setSelectedDeviceId(backCam ? backCam.deviceId : videoInputs[0].deviceId);
      }
    } catch (err) {
      console.warn('Could not enumerate video devices:', err);
    }
  }, [selectedDeviceId]);

  // Start Webcam Stream with high-definition constraints
  const startCamera = useCallback(async () => {
    setCameraError('');
    setCapturedImage(null);
    setScanResult(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError('Webcam access is not supported by your browser or environment. Please use file upload.');
      return;
    }

    try {
      // Stop any existing stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: selectedDeviceId 
          ? { deviceId: { exact: selectedDeviceId }, width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } }
          : { facingMode: 'environment', width: { ideal: 1920, min: 1280 }, height: { ideal: 1080, min: 720 } }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setCameraActive(true);
      await getVideoDevices();
    } catch (err) {
      console.error('Camera access error:', err);
      let msg = 'Could not access webcam.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        msg = 'Camera permission was denied. Please allow camera permissions in browser settings.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        msg = 'No camera device found on this system.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        msg = 'Camera is already in use by another application.';
      }
      setCameraError(msg);
      setCameraActive(false);
    }
  }, [selectedDeviceId, getVideoDevices]);

  // Stop Webcam Stream
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (isOpen && activeTab === 'webcam') {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, activeTab, startCamera, stopCamera]);

  // Switch camera device
  const handleSwitchCamera = () => {
    if (devices.length <= 1) return;
    const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
    const nextIndex = (currentIndex + 1) % devices.length;
    setSelectedDeviceId(devices[nextIndex].deviceId);
  };

  // Capture current video frame with high resolution
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1920;
    canvas.height = video.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    setCapturedImage(dataUrl);
    stopCamera();
    return dataUrl;
  };

  // Process captured image from webcam
  const handleScanWebcam = async () => {
    const base64Image = captureFrame();
    if (!base64Image) {
      toast.error('Failed to capture frame from webcam');
      return;
    }

    setIsProcessing(true);
    try {
      toast.loading('🤖 AI & OCR Scanning Inward Document...', { id: 'ebillScan' });
      const res = await gateEntryAPI.scanEBill({ imageBase64: base64Image });
      
      const extracted = res.data.data;
      setScanResult(extracted);
      setLastMatchedPO(res.data.matchedPO);
      setLastInvoiceUrl(res.data.invoiceUrl);
      toast.success('✨ Document Scanned! All fields extracted successfully.', { id: 'ebillScan' });
    } catch (err) {
      console.error('Scan Error:', err);
      toast.error(err.response?.data?.message || 'Failed to extract data from image', { id: 'ebillScan' });
      setCapturedImage(null);
      startCamera();
    } finally {
      setIsProcessing(false);
    }
  };

  // Process file upload (DOCX, PDF, Images, Excel, CSV)
  const handleScanUploadedFile = async () => {
    if (!selectedFile) {
      toast.error('Please select a document, PDF, or image file first');
      return;
    }

    setIsProcessing(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      toast.loading('🤖 AI extracting fields from document...', { id: 'ebillScan' });
      const res = await gateEntryAPI.scanEBill(formData);
      
      const extracted = res.data.data;
      setScanResult(extracted);
      setLastMatchedPO(res.data.matchedPO);
      setLastInvoiceUrl(res.data.invoiceUrl);
      toast.success('✨ Document parsed & prefilled successfully!', { id: 'ebillScan' });
    } catch (err) {
      console.error('File scan error:', err);
      toast.error(err.response?.data?.message || 'Failed to parse file', { id: 'ebillScan' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Process Quick Demo Sample Bill
  const handleSelectDemoSample = async (sampleType) => {
    setIsProcessing(true);
    try {
      toast.loading(`⚡ Loading sample ${sampleType.toUpperCase()} E-Way Bill...`, { id: 'ebillScan' });
      const res = await gateEntryAPI.scanEBill({ sampleType });
      
      const extracted = res.data.data;
      setScanResult(extracted);
      setLastMatchedPO(res.data.matchedPO);
      setLastInvoiceUrl(res.data.invoiceUrl);
      toast.success('✨ Sample E-Bill extracted & prefilled!', { id: 'ebillScan' });
    } catch (err) {
      toast.error('Failed to load demo sample', { id: 'ebillScan' });
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply to Form and Close
  const handleApplyToForm = () => {
    if (!scanResult) return;
    if (onScanComplete) {
      onScanComplete({
        ...scanResult,
        matchedPO: lastMatchedPO,
        invoiceUrl: lastInvoiceUrl || scanResult.invoiceUrl
      });
    }
    stopCamera();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200, padding: '16px',
      animation: 'fadeIn 0.2s ease'
    }}>
      <div style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: '20px',
        width: '100%',
        maxWidth: '780px',
        maxHeight: '92vh',
        overflow: 'hidden',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          padding: '18px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: 'var(--c-blue-soft)'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <HiOutlineSparkles style={{ color: 'var(--primary)', fontSize: '1.4rem' }} />
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                AI Document & E-Way Bill Scanner
              </h3>
              <span style={{
                background: 'var(--c-blue-soft)',
                color: 'var(--c-blue)',
                fontSize: '0.72rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '6px'
              }}>
                A to Z Auto-Fill
              </span>
            </div>
            <p style={{ margin: '3px 0 0', fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Scan via Live Webcam or upload Invoices, Challans & E-Way Bills (DOCX, PDF, Images) to auto-fill all Inward fields
            </p>
          </div>
          <button 
            onClick={() => { stopCamera(); onClose(); }}
            style={{
              background: 'transparent', border: 'none', color: 'var(--text-dim)',
              fontSize: '1.4rem', cursor: 'pointer', padding: '4px', borderRadius: '6px'
            }}
          >
            <HiOutlineX />
          </button>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          gap: '8px',
          padding: '12px 24px',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
          background: 'var(--bg-input)'
        }}>
          {[
            { key: 'upload', label: '📁 Upload File / DOCX / PDF', icon: <HiOutlineUpload /> },
            { key: 'webcam', label: '📸 Live Webcam Scanner', icon: <HiOutlineCamera /> },
            { key: 'demo', label: '⚡ Demo Sample Bills', icon: <HiOutlineSparkles /> },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                border: activeTab === t.key ? '1px solid var(--primary)' : '1px solid transparent',
                background: activeTab === t.key ? 'var(--primary)' : 'transparent',
                color: activeTab === t.key ? '#ffffff' : 'var(--text-secondary)'
              }}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>

        {/* Body Content */}
        <div style={{ padding: '24px', overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>
          
          {/* TAB 1: FILE UPLOAD (DOCX, PDF, IMAGES, CSV) */}
          {activeTab === 'upload' && (
            <div>
              <div 
                onClick={() => fileInputRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) setSelectedFile(e.dataTransfer.files[0]);
                }}
                style={{
                  border: '2px dashed var(--primary)',
                  borderRadius: '16px',
                  padding: '36px 20px',
                  textAlign: 'center',
                  background: 'var(--c-blue-soft)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }}
                  accept=".pdf,.doc,.docx,.xlsx,.xls,.csv,.txt,image/*"
                  onChange={e => setSelectedFile(e.target.files?.[0] || null)}
                />
                <HiOutlineDocumentText style={{ fontSize: '3.2rem', color: 'var(--primary)', marginBottom: '10px', opacity: 0.85 }} />
                
                {selectedFile ? (
                  <div>
                    <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      📄 {selectedFile.name}
                    </span>
                    <div style={{ fontSize: '0.8rem', color: 'var(--success)', marginTop: '4px', fontWeight: 600 }}>
                      {(selectedFile.size / 1024).toFixed(1)} KB — Ready to Scan & Extract with AI
                    </div>
                  </div>
                ) : (
                  <div>
                    <h4 style={{ margin: '0 0 6px', fontSize: '1.05rem', color: 'var(--text-primary)', fontWeight: 700 }}>
                      Drag & Drop E-Way Bill, Material Challan, or Invoice
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-dim)' }}>
                      Supports Word (.docx, .doc), PDF, Excel (.xlsx), CSV, and Scanned Images (PNG, JPG, JPEG)
                    </p>
                  </div>
                )}
              </div>

              <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                  ⚡ AI automatically extracts Vehicle, Driver, Vendor, PO, Items, Qty & Unit.
                </span>

                <button
                  className="btn btn-primary"
                  onClick={handleScanUploadedFile}
                  disabled={!selectedFile || isProcessing}
                  style={{
                    padding: '10px 24px',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    background: 'var(--c-blue)'
                  }}
                >
                  <HiOutlineLightningBolt /> {isProcessing ? 'AI Analyzing Document...' : 'Extract & Pre-fill Form'}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: WEBCAM SCANNER */}
          {activeTab === 'webcam' && (
            <div>
              {cameraError ? (
                <div style={{
                  padding: '28px', textAlign: 'center',
                  background: 'var(--danger-soft)', borderRadius: '16px',
                  border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)'
                }}>
                  <p style={{ color: 'var(--danger)', fontWeight: 600, marginBottom: '16px' }}>{cameraError}</p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button className="btn btn-secondary btn-sm" onClick={startCamera}>
                      <HiOutlineRefresh /> Retry Camera
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => setActiveTab('upload')}>
                      <HiOutlineUpload /> Switch to File Upload
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  {/* Viewfinder Frame */}
                  <div style={{
                    position: 'relative',
                    width: '100%',
                    height: '340px',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: 'var(--bg-primary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid color-mix(in srgb, var(--c-blue) 40%, transparent)',
                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
                  }}>
                    {capturedImage ? (
                      <img 
                        src={capturedImage} 
                        alt="Captured Document" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
                      />
                    ) : (
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    )}

                    {/* Document Guide Overlay */}
                    {!capturedImage && (
                      <div style={{
                        position: 'absolute',
                        inset: '24px',
                        border: '2px dashed color-mix(in srgb, var(--c-blue) 60%, transparent)',
                        borderRadius: '12px',
                        pointerEvents: 'none',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '12px',
                        boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.3)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ width: '20px', height: '20px', borderTop: '4px solid var(--c-blue)', borderLeft: '4px solid var(--c-blue)' }} />
                          <div style={{ width: '20px', height: '20px', borderTop: '4px solid var(--c-blue)', borderRight: '4px solid var(--c-blue)' }} />
                        </div>

                        {/* Scanner Laser Animation */}
                        <div style={{
                          height: '2px',
                          background: 'linear-gradient(90deg, transparent, var(--c-blue), var(--c-blue), var(--c-blue), transparent)',
                          boxShadow: '0 0 8px var(--c-blue)',
                          animation: 'pulse 1.8s ease-in-out infinite'
                        }} />

                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <div style={{ width: '20px', height: '20px', borderBottom: '4px solid var(--c-blue)', borderLeft: '4px solid var(--c-blue)' }} />
                          <div style={{ width: '20px', height: '20px', borderBottom: '4px solid var(--c-blue)', borderRight: '4px solid var(--c-blue)' }} />
                        </div>
                      </div>
                    )}

                    {/* Processing Overlay */}
                    {isProcessing && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.75)',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', gap: '12px'
                      }}>
                        <div className="spinner" style={{ width: '40px', height: '40px' }} />
                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>AI Extracting Bill & Inward Details...</span>
                      </div>
                    )}
                  </div>

                  {/* Hidden Canvas for Frame Capture */}
                  <canvas ref={canvasRef} style={{ display: 'none' }} />

                  {/* Controls Toolbar */}
                  <div style={{
                    marginTop: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {devices.length > 1 && (
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={handleSwitchCamera}
                          title="Switch Camera / Device"
                          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <HiOutlineSwitchHorizontal /> Switch Camera ({devices.length})
                        </button>
                      )}
                      {capturedImage && (
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => { setCapturedImage(null); startCamera(); }}
                          style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <HiOutlineRefresh /> Retake Photo
                        </button>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        className="btn btn-primary"
                        onClick={handleScanWebcam}
                        disabled={isProcessing || !cameraActive}
                        style={{
                          padding: '10px 24px',
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          background: 'var(--c-blue)',
                          boxShadow: '0 4px 14px rgba(59, 130, 246, 0.4)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}
                      >
                        <HiOutlineCamera style={{ fontSize: '1.2rem' }} />
                        {isProcessing ? 'AI Processing Scan...' : 'Capture & Scan with AI'}
                      </button>
                    </div>
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: '12px', marginBottom: 0 }}>
                    💡 Tip: Align physical E-Way bill or invoice inside the camera guide box for sharp optical character recognition.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DEMO SAMPLE E-BILLS */}
          {activeTab === 'demo' && (
            <div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                Select a standard pre-configured E-Way bill or supplier invoice to test immediate extraction & prefilling:
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {[
                  {
                    key: 'nylon',
                    title: 'Nylon 66 Granules E-Way Bill',
                    vendor: 'Apex Polymers & Synthetic Resins Pvt Ltd',
                    vehicle: 'MH-12-AB-8842',
                    qty: '500 KG',
                    color: 'var(--c-blue)',
                    type: 'Raw Material'
                  },
                  {
                    key: 'pigment',
                    title: 'Black Masterbatch Invoice',
                    vendor: 'Supreme Masterbatch & Colorant Chem Pvt Ltd',
                    vehicle: 'DL-01-EA-5566',
                    qty: '150 KG',
                    color: 'var(--c-violet)',
                    type: 'Colorant Pigment'
                  },
                  {
                    key: 'packaging',
                    title: '5-Ply Corrugated Boxes E-Bill',
                    vendor: 'PackWell Heavy Cartons & Packaging',
                    vehicle: 'HR-26-DQ-9901',
                    qty: '250 Boxes',
                    color: 'var(--warning)',
                    type: 'Packaging Material'
                  },
                  {
                    key: 'hardware',
                    title: 'Stainless Steel Fasteners Bill',
                    vendor: 'Metro Industrial Fasteners & Hardware',
                    vehicle: 'MH-14-GH-4321',
                    qty: '2,000 PCS',
                    color: 'var(--success)',
                    type: 'Hardware & Pins'
                  }
                ].map(demo => (
                  <div
                    key={demo.key}
                    onClick={() => handleSelectDemoSample(demo.key)}
                    style={{
                      padding: '16px',
                      borderRadius: '12px',
                      background: 'var(--bg-card-hover)',
                      border: '1px solid var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                    onMouseOver={e => e.currentTarget.style.borderColor = demo.color}
                    onMouseOut={e => e.currentTarget.style.borderColor = 'var(--border)'}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        {demo.title}
                      </span>
                      <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: `color-mix(in srgb, ${demo.color} 13%, transparent)`, color: demo.color, fontWeight: 700 }}>
                        {demo.type}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      🏢 {demo.vendor}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '4px' }}>
                      <span>🚛 {demo.vehicle}</span>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>📦 {demo.qty}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Scan Results Card if extracted */}
          {scanResult && (
            <div style={{
              marginTop: '24px',
              padding: '20px',
              borderRadius: '16px',
              background: 'var(--success-soft)',
              border: '1px solid color-mix(in srgb, var(--success) 35%, transparent)',
              boxShadow: '0 8px 24px rgba(34, 197, 94, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HiOutlineCheckCircle style={{ color: 'var(--success)', fontSize: '1.4rem' }} />
                  <span style={{ fontWeight: 800, color: 'var(--success)', fontSize: '1rem' }}>
                    AI Auto-Extracted Details (A to Z)
                  </span>
                  {scanResult.confidence === 'ai_high' && (
                    <span style={{ fontSize: '0.72rem', background: 'var(--success)', color: '#fff', padding: '2px 6px', borderRadius: '4px', fontWeight: 700 }}>
                      ⚡ AI Verified
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleApplyToForm}
                  style={{
                    background: 'var(--success)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '8px 18px',
                    fontWeight: 800,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                  }}
                >
                  <HiOutlineCheck /> Apply & Pre-fill Inward Form
                </button>
              </div>

              {/* Grid of Extracted Fields */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '0.85rem' }}>
                
                {/* Bill / Challan No */}
                <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <HiOutlineHashtag /> Bill / Challan No:
                  </span>
                  <strong style={{ color: 'var(--primary)', fontSize: '0.92rem' }}>
                    {scanResult.billNumber || '--'}
                  </strong>
                </div>

                {/* Vehicle Number */}
                <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <HiOutlineTruck /> Vehicle Number:
                  </span>
                  <strong style={{ color: scanResult.vehicleNumber ? 'var(--warning)' : 'var(--text-muted)', fontSize: '0.92rem' }}>
                    {scanResult.vehicleNumber || 'Pending / Road'}
                  </strong>
                </div>

                {/* Vendor Name */}
                <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <HiOutlineOfficeBuilding /> Vendor / Consignor:
                  </span>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {scanResult.vendorName || '--'}
                  </strong>
                </div>

                {/* Driver Details */}
                <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <HiOutlineUser /> Driver & Phone:
                  </span>
                  <strong style={{ color: 'var(--text-primary)' }}>
                    {scanResult.driverName || 'Driver'} {scanResult.driverPhone ? `(${scanResult.driverPhone})` : ''}
                  </strong>
                </div>

                {/* Material & Description */}
                <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)', gridColumn: 'span 2' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <HiOutlineCube /> Material Description ({scanResult.materialType}):
                  </span>
                  <strong style={{ color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                    {scanResult.materialDescription || scanResult.materialType}
                  </strong>
                </div>

                {/* Quantity & Unit */}
                <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <HiOutlineCube /> Inward Quantity:
                  </span>
                  <strong style={{ color: 'var(--success)', fontSize: '1rem' }}>
                    {scanResult.quantity} {scanResult.unit}
                  </strong>
                </div>

                {/* PO Number / Match */}
                <div style={{ background: 'var(--bg-card)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ color: 'var(--text-dim)', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <HiOutlineHashtag /> Purchase Order (PO):
                  </span>
                  <strong style={{ color: scanResult.poNumber ? 'var(--c-violet)' : 'var(--text-muted)' }}>
                    {scanResult.poNumber || (lastMatchedPO ? lastMatchedPO.poNumber : 'Direct Inward')}
                  </strong>
                </div>

              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default WebcamEBillScanner;
