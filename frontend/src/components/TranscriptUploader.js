// frontend/src/components/TranscriptUploader.js
import React from 'react';

function TranscriptUploader({ onUploadComplete }) {

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);

        try {
        const response = await fetch('/api/upload_transcript', {
            method: 'POST',
            body: formData,
        });

        // Get the JSON response regardless of success or failure
        const result = await response.json();

        if (response.ok) {
            console.log("Success:", result.message);
            onUploadComplete();
        } else {
            // --- THIS IS THE KEY CHANGE ---
            // If it fails, log the debug info from the backend
            console.error('Failed to upload transcript.');
            console.error('Backend Response:', result); // This will show us the extracted text
            alert('Failed to parse transcript. Check the console for debug info.');
        }
        } catch (error) {
        console.error('Error uploading transcript:', error);
        alert('A critical error occurred while uploading.');
        }
  };

  return (
    <div style={{ marginTop: '30px' }}>
      <h3>or Upload Transcript (PDF)</h3>
      <p style={{fontSize: '0.8rem', opacity: 0.7}}>This will replace all current courses.</p>
      <input 
        type="file" 
        accept=".pdf" // We now accept PDFs instead of CSVs
        onChange={handleFileChange} 
      />
    </div>
  );
}

export default TranscriptUploader;