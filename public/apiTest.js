const response = await fetch('./sample/1.jpg');
const blob = await response.blob();
const file = new File([blob], 'userImage.jpg', { type: blob.type }); // construct file for AI detection
const fileType = file.type; // Get the file type from the File object
processImage(file, fileType, 1); // Call the function with the file and its type

async function generateToken() {
    const secret = 'ziptrak'; // Hardcoded secret
    const timestamp = Math.floor(Date.now() / 1000); // Get current timestamp in seconds

    // Convert secret and timestamp to Uint8Array
    const encoder = new TextEncoder();
    const keyData = encoder.encode(secret);  // Encode secret
    const messageData = encoder.encode(timestamp); // Encode timestamp as string

    // Import the key for HMAC-SHA512
    const key = await window.crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: { name: "SHA-512" } },
        false,
        ["sign"]
    );

    // Generate the HMAC signature
    const signature = await window.crypto.subtle.sign("HMAC", key, messageData);

    // Convert the signature to a lowercase hex string (to match Python hexdigest())
    const token = Array.from(new Uint8Array(signature))
        .map(b => b.toString(16).padStart(2, "0")) // Ensures lowercase hex output
        .join("");

    return token;
}

// async function activateSystem() {
//     const response = await fetch("https://ziptrak-ai.ddos.la/system/activate", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ token: generateToken() })
//     });

//     const result = await response.json();
//     console.log("System Activation:", result);
// }

async function getPresignedUrl(fileType) {
    const token = await generateToken();
    const response = await fetch("https://ziptrak-ai.ddos.la/file/get_presigned_url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({  token: token, file_type: fileType })
    });

    const result = await response.json();
    console.log("Pre-Signed URL:", result);
    return result.data;
}

async function uploadFile(file, url) {
    const response = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type }
    });

    if (response.ok) {
        console.log("File uploaded successfully");
    } else {
        console.error("Upload failed", await response.text());
    }
}

async function detectImage(fileKey, isIndoor = 1) {
    const token = await generateToken();

    const response = await fetch("https://ziptrak-ai.ddos.la/detect/image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ file_key: fileKey, is_indoor: isIndoor, token: token })
    });

    const result = await response.json();
    console.log("Detection Result:", result);
    return result.data;
}

async function processImage(file, fileType, isIndoor = 1) {
    const response = await getPresignedUrl(fileType);
    console.log("Pre-Signed URL Response:", response);
    const url = response.url;
    const key = response.key;
    await uploadFile(file, url);
    const detectResponse = await detectImage(key, isIndoor);
    console.log("Detection response", detectResponse);
}