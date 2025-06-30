import React, { useState, useEffect } from 'react';
import { Container, Button, ListGroup } from 'react-bootstrap';

function DrivePage() {
  const [files, setFiles] = useState([]);
  const [accessToken, setAccessToken] = useState(null);

  useEffect(() => {
    // Google OAuth flow (simplified)
    const initDrive = () => {
      // Replace with actual OAuth client ID and redirect URI from Google Cloud Console
      const clientId = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
      const scope = 'https://www.googleapis.com/auth/drive';
      const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=http://localhost:5000/drive&response_type=token&scope=${scope}`;
      window.location.href = url; // Redirect for auth
    };

    // Handle token from redirect
    const hash = window.location.hash;
    if (hash.includes('access_token')) {
      const token = new URLSearchParams(hash.substring(1)).get('access_token');
      setAccessToken(token);
      fetchDriveFiles(token);
    }
  }, []);

  const fetchDriveFiles = async (token) => {
    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    setFiles(data.files);
  };

  const createAugmentEDFolder = async (token) => {
    const response = await fetch('https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'augmentED',
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });
    const data = await response.json();
    console.log('Folder created:', data);
  };

  return (
    <Container>
      <h2>Google Drive Integration</h2>
      {!accessToken ? (
        <Button onClick={initDrive}>Connect Google Drive</Button>
      ) : (
        <>
          <Button onClick={() => createAugmentEDFolder(accessToken)}>Create augmentED Folder</Button>
          <ListGroup>
            {files.map(file => (
              <ListGroup.Item key={file.id}>{file.name}</ListGroup.Item>
            ))}
          </ListGroup>
        </>
      )}
    </Container>
  );
}

export default DrivePage;