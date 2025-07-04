// frontend/src/components/TranscriptUploader.js
import React, { useState } from 'react';
import { Button, Spinner, Alert } from 'react-bootstrap';

function TranscriptUploader({ onUploadComplete }) {
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);
    const [messageType, setMessageType] = useState(null); // 'success' or 'danger'

    const handleFileChange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            setMessage('No file selected.');
            setMessageType('danger');
            return;
        }

        setUploading(true);
        setMessage(null);
        setMessageType(null);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await fetch('/api/upload_transcript', {
                method: 'POST',
                body: formData,
            });

            const result = await response.json();

            if (response.ok) {
                setMessage(result.message || 'Transcript uploaded successfully!');
                setMessageType('success');
                onUploadComplete();
            } else {
                setMessage(result.message || 'Failed to upload transcript.');
                setMessageType('danger');
                console.error('Backend Response:', result);
            }
        } catch (error) {
            setMessage('A critical error occurred while uploading.');
            setMessageType('danger');
            console.error('Error uploading transcript:', error);
        } finally {
            setUploading(false);
            e.target.value = null; // Clear the input so the same file can be uploaded again
        }
    };

    return (
        <div style={{ marginTop: '30px' }}>
            <h3>or Upload Transcript (PDF)</h3>
            <p style={{ fontSize: '0.8rem', opacity: 0.7 }}>This will replace all current courses.</p>
            <input
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                disabled={uploading}
                style={{ display: 'none' }} // Hide the default input
                id="transcript-upload-input"
            />
            <label htmlFor="transcript-upload-input">
                <Button variant="primary" as="span" disabled={uploading}>
                    {uploading ? (
                        <Spinner
                            as="span"
                            animation="border"
                            size="sm"
                            role="status"
                            aria-hidden="true"
                            className="me-2"
                        />
                    ) : (
                        ''
                    )}
                    {uploading ? 'Uploading...' : 'Choose PDF and Upload'}
                </Button>
            </label>

            {message && (
                <Alert variant={messageType} className="mt-3">
                    {message}
                </Alert>
            )}
        </div>
    );
}

export default TranscriptUploader;