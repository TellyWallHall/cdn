// Additional features you might want:
async function uploadWithVersioning(filename, file) {
    // Add timestamp for cache busting
    const timestamp = Date.now();
    const versionedName = `${filename}?v=${timestamp}`;
    const fileRef = storage.ref().child(`cdn/${versionedName}`);
    
    // Upload and return both versioned and clean URLs
    const snapshot = await fileRef.put(file);
    const downloadURL = await snapshot.ref.getDownloadURL();
    const cleanURL = downloadURL.split('?')[0]; // URL without timestamp
    
    return { versioned: downloadURL, clean: cleanURL };
}

// File validation
function validateFile(file) {
    const validTypes = ['application/javascript', 'text/css'];
    const maxSize = 5 * 1024 * 1024; // 5MB
    
    if (!validTypes.includes(file.type) && !file.name.endsWith('.js') && !file.name.endsWith('.css')) {
        throw new Error('Only JS and CSS files allowed');
    }
    
    if (file.size > maxSize) {
        throw new Error('File too large (max 5MB)');
    }
    
    return true;
}