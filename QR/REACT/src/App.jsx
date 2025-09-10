import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [url, setUrl] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('');
  const [customText, setCustomText] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [useCustomPattern, setUseCustomPattern] = useState(false);
  const [readabilityWarning, setReadabilityWarning] = useState('');

  const generateQRCode = async (e) => {
    e.preventDefault();
    
    if (!url.trim()) {
      setError('Please enter a URL');
      return;
    }

    setLoading(true);
    setError('');
    setQrCode('');
    setReadabilityWarning('');

    try {
      const formData = new FormData();
      formData.append('url', url.trim());
      formData.append('useCustomPattern', useCustomPattern.toString());
      
      if (useCustomPattern && selectedEmoji) {
        formData.append('emoji', selectedEmoji);
      }
      
      if (useCustomPattern && customText) {
        formData.append('customText', customText);
      }
      
      if (useCustomPattern && uploadedFile) {
        formData.append('customImage', uploadedFile);
      }

      const response = await axios.post('/api/generate-qr', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data.success) {
        setQrCode(response.data.qrCode);
        if (response.data.warning) {
          setReadabilityWarning(response.data.warning);
        }
      } else {
        setError('Failed to generate QR code');
      }
    } catch (err) {
      console.error('Error generating QR code:', err);
      const errorMessage = err.response?.data?.error || err.message || 'Something went wrong';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (qrCode) {
      const link = document.createElement('a');
      link.href = qrCode;
      link.download = 'qrcode.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedFile(file);
      setSelectedEmoji(''); 
      setCustomText(''); // Clear text when file is uploaded
    }
  };

  const handleEmojiSelect = (emoji) => {
    setSelectedEmoji(emoji);
    setUploadedFile(null); 
    setCustomText(''); // Clear text when emoji is selected
  };

  const handleTextChange = (text) => {
    setCustomText(text);
    setSelectedEmoji(''); // Clear emoji when text is entered
    setUploadedFile(null); // Clear file when text is entered
  };

  return (
    <div className="app">
      <div className="container">
        <h1 className="title">QR Code Generator</h1>
        <p className="subtitle">Convert any URL into a QR code instantly</p>
        
        <form onSubmit={generateQRCode} className="form">
          <div className="input-group">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Enter your URL here..."
              className="url-input"
              disabled={loading}
              autoComplete="off"
            />
            
            <div className="custom-options">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={useCustomPattern}
                  onChange={(e) => setUseCustomPattern(e.target.checked)}
                  disabled={loading}
                />
                <span>Use custom pattern</span>
              </label>
            </div>

            {useCustomPattern && (
              <div className="custom-pattern-options">
                <div className="text-section">
                  <h3>Enter custom text:</h3>
                  <input
                    type="text"
                    value={customText}
                    onChange={(e) => handleTextChange(e.target.value)}
                    placeholder="e.g., X, , ❤️ , 😄 , 💎 , ABC..."
                    className="text-input"
                    disabled={loading}
                    maxLength={10}
                  />
                  <p className="text-hint">Enter letters, words, or symbols (max 10 characters)</p>
                </div>




                <div className="divider">
                  <span>OR</span>
                </div>

                <div className="file-upload-section">
                  <h3>Upload an image:</h3>
                  <div className="file-upload">
                    <input
                      type="file"
                      id="image-upload"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={loading}
                      className="file-input"
                    />
                    <label htmlFor="image-upload" className="file-label">
                      {uploadedFile ? uploadedFile.name : 'Choose Image'}
                    </label>
                  </div>
                  {uploadedFile && (
                    <div className="file-preview">
                      <img 
                        src={URL.createObjectURL(uploadedFile)} 
                        alt="Preview" 
                        className="preview-image"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <button 
              type="submit" 
              className="generate-btn"
              disabled={loading}
            >
              {loading ? 'Generating...' : 'Generate QR Code'}
            </button>
          </div>
        </form>

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {readabilityWarning && (
          <div className="warning-message">
            <div className="warning-icon">⚠️</div>
            <div className="warning-text">
              <strong>Readability Warning:</strong>
              <p>{readabilityWarning}</p>
            </div>
          </div>
        )}

        {qrCode && (
          <div className="qr-result">
            <div className="qr-container">
              <img src={qrCode} alt="Generated QR Code" className="qr-image" />
            </div>
            <button onClick={downloadQRCode} className="download-btn">
              Download QR Code
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
