import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { Html5Qrcode } from 'html5-qrcode';
import toast from 'react-hot-toast';
import {
  LuCircleCheckBig as HiOutlineCheckCircle,
  LuCamera as HiOutlineCamera,
  LuRefreshCw as HiOutlineRefresh,
} from 'react-icons/lu';

// const SOCKET_URL = process.env.REACT_APP_API_URL || `http://${window.location.hostname}:5000`;
const SOCKET_URL = process.env.REACT_APP_API_URL || (window.location.port ? `${window.location.protocol}//${window.location.hostname}:6465` : window.location.origin);

const RemoteScanner = () => {
  const [searchParams] = useSearchParams();
  const session = searchParams.get('session');
  const [socket, setSocket] = useState(null);
  const [lastScanned, setLastScanned] = useState(null);
  const [cameraError, setCameraError] = useState('');
  const scannerRef = useRef(null);

  useEffect(() => {
    if (!session) {
      setCameraError('Invalid Session URL. Please scan the QR from the Desktop ERP again.');
      return;
    }

    // Connect WebSocket
    const newSocket = io(SOCKET_URL, {
      withCredentials: true,
    });
    setSocket(newSocket);

    newSocket.on('connect', () => {
      newSocket.emit('join_room', session);
      toast.success('Connected to Desktop Session');
    });

    return () => newSocket.disconnect();
  }, [session]);

  useEffect(() => {
    if (!session || cameraError) return;

    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const startScanner = async () => {
      try {
        await html5QrCode.start(
          { facingMode: "environment" }, // Back camera
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
          },
          (decodedText, decodedResult) => {
            // Success Callback
            if (socket) {
              socket.emit('scan_event', { session, payload: decodedText });
              
              setLastScanned(decodedText);
              // Play a native beep sound on mobile
              try { navigator.vibrate && navigator.vibrate(200); } catch (e) {}
              
              // Prevent flooding by pausing briefly
              html5QrCode.pause();
              setTimeout(() => {
                setLastScanned(null);
                html5QrCode.resume();
              }, 1500);
            }
          },
          (errorMessage) => {
            // Parse Error Callback (ignore constant background noise)
          }
        );
      } catch (err) {
        console.error(err);
        setCameraError('Camera access denied or device not supported. Ensure you are on HTTPS or using localhost.');
      }
    };

    startScanner();

    return () => {
      if (html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [session, socket]); // Include socket so it binds correctly

  const handleRetry = () => {
    window.location.reload();
  };

  if (!session) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--danger)', marginTop: '50px' }}>
        <h2>Invalid Session</h2>
        <p>No session ID found. Scan the Desktop QR code again.</p>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--bg-card)', minHeight: '100vh', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '20px' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--c-blue)', marginBottom: '20px' }}>
        <HiOutlineCamera /> Mobile Remote Scanner
      </h2>
      
      <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '20px', textAlign: 'center' }}>
        Point your camera at a Box barcode/QR. Data will instantly send to the desktop.
      </p>

      {cameraError ? (
        <div style={{ background: 'var(--danger-soft)', padding: '20px', borderRadius: '12px', border: '1px solid color-mix(in srgb, var(--danger) 30%, transparent)', textAlign: 'center', maxWidth: '400px' }}>
          <p style={{ color: 'var(--danger)', marginBottom: '16px' }}>{cameraError}</p>
          <button className="btn btn-primary" onClick={handleRetry} style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <HiOutlineRefresh /> Retry Camera
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <div id="reader" style={{ width: '100%', borderRadius: '16px', overflow: 'hidden', border: '2px solid color-mix(in srgb, var(--c-blue) 30%, transparent)' }}></div>
          
          {lastScanned && (
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
              background: 'color-mix(in srgb, var(--success) 85%, transparent)', backdropFilter: 'blur(4px)',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              zIndex: 10, animation: 'fadeIn 0.2s ease'
            }}>
              <HiOutlineCheckCircle style={{ fontSize: '4rem', color: '#fff', marginBottom: '12px' }} />
              <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.2rem', textAlign: 'center', padding: '0 20px' }}>
                Scanned Successfully!
              </div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.9rem', marginTop: '8px' }}>{lastScanned.substring(0, 30)}</div>
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '30px', padding: '16px', background: 'var(--c-blue-soft)', borderRadius: '12px', border: '1px solid color-mix(in srgb, var(--c-blue) 10%, transparent)', maxWidth: '400px', width: '100%' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Connection Status</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: socket?.connected ? 'var(--success)' : 'var(--danger)' }}></div>
          <span style={{ fontWeight: 600, color: socket?.connected ? 'var(--success)' : 'var(--danger)' }}>
            {socket?.connected ? 'Linked to Desktop' : 'Disconnected'}
          </span>
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>Session: {session}</div>
      </div>
    </div>
  );
};

export default RemoteScanner;
