const $ = (id) => document.getElementById(id);

let selectedHashFile = null;
let lastHashResult = null;

const MAX_FILE_SIZE = 50 * 1024 * 1024;

function showMessage(elementId, message) {
    const element = $(elementId);
    element.textContent = message;
    element.classList.remove("hidden");
}

function clearMessage(elementId) {
    $(elementId).textContent = "";
    $(elementId).classList.add("hidden");
}

function validateFile(file) {
    if (!file) {
        return "Please select a file.";
    }

    if (file.size > MAX_FILE_SIZE) {
        return "The file exceeds the 50 MB size limit.";
    }

    return null;
}

function formatSize(bytes) {
    if (bytes < 1024) {
        return `${bytes} bytes`;
    }

    if (bytes < 1024 ** 2) {
        return `${(bytes / 1024).toFixed(2)} KB`;
    }

    if (bytes < 1024 ** 3) {
        return `${(bytes / 1024 ** 2).toFixed(2)} MB`;
    }

    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

function setBusy(button, busy, busyText, normalText) {
    button.disabled = busy;
    button.textContent = busy ? busyText : normalText;
}


// -------- Single-file selection --------

$("chooseSingle").addEventListener("click", () => {
    $("singleFile").click();
});

$("singleFile").addEventListener("change", (event) => {
    const file = event.target.files[0];

    if (!file) return;

    selectedHashFile = file;
    lastHashResult = null;

    $("hashResults").classList.add("hidden");
    clearMessage("hashMessage");

    $("singleInfo").textContent =
        `${file.name} • ${formatSize(file.size)}`;
});


// -------- Drag and drop --------

const dropZone = $("singleDrop");

dropZone.addEventListener("dragover", (event) => {
    event.preventDefault();
    dropZone.classList.add("dragover");
});

dropZone.addEventListener("dragleave", () => {
    dropZone.classList.remove("dragover");
});

dropZone.addEventListener("drop", (event) => {
    event.preventDefault();
    dropZone.classList.remove("dragover");

    const file = event.dataTransfer.files[0];

    if (!file) return;

    selectedHashFile = file;
    lastHashResult = null;

    $("singleFile").value = "";
    $("hashResults").classList.add("hidden");
    clearMessage("hashMessage");

    $("singleInfo").textContent =
        `${file.name} • ${formatSize(file.size)}`;
});


// -------- Generate hashes --------

$("generateButton").addEventListener("click", async () => {
    const file = selectedHashFile;
    const error = validateFile(file);

    if (error) {
        showMessage("hashMessage", error);
        return;
    }

    clearMessage("hashMessage");

    const button = $("generateButton");

    setBusy(
        button,
        true,
        "Calculating checksums...",
        "Generate Checksums →"
    );

    try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/hash", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Hash generation failed.");
        }

        lastHashResult = data;

        $("fileMetadata").textContent =
            `${data.filename} • ${formatSize(data.size)}`;

        $("md5Value").textContent = data.md5;
        $("sha256Value").textContent = data.sha256;

        $("hashResults").classList.remove("hidden");

    } catch (error) {
        showMessage("hashMessage", error.message);

    } finally {
        setBusy(
            button,
            false,
            "",
            "Generate Checksums →"
        );
    }
});


// -------- Copy checksum --------

document.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
        if (!lastHashResult) return;

        const algorithm = button.dataset.copy;
        const value = lastHashResult[algorithm];

        try {
            await navigator.clipboard.writeText(value);

            button.textContent = "Copied!";

            setTimeout(() => {
                button.textContent = "Copy";
            }, 1500);

        } catch {
            showMessage(
                "hashMessage",
                "Clipboard access failed. Select and copy the hash manually."
            );
        }
    });
});


// -------- Download checksum report --------

$("downloadResults").addEventListener("click", () => {
    if (!lastHashResult) return;

    const data = lastHashResult;

    const report = [
        "HASHVAULT - FILE CHECKSUM REPORT",
        "================================",
        `File: ${data.filename}`,
        `Size: ${formatSize(data.size)}`,
        "",
        `MD5: ${data.md5}`,
        "",
        `SHA-256: ${data.sha256}`,
        ""
    ].join("\n");

    const blob = new Blob([report], {
        type: "text/plain;charset=utf-8"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = "checksum_report.txt";
    link.click();

    URL.revokeObjectURL(url);
});


// -------- Comparison file selection --------

function configureCompareInput(index) {
    const input = $(`compareFile${index}`);
    const chooseButton = $(`chooseCompare${index}`);
    const info = $(`compareInfo${index}`);

    chooseButton.addEventListener("click", () => {
        input.click();
    });

    input.addEventListener("change", () => {
        const file = input.files[0];

        if (!file) return;

        info.textContent =
            `${file.name} • ${formatSize(file.size)}`;

        $("compareResult").classList.add("hidden");
        clearMessage("compareMessage");
    });
}

configureCompareInput(1);
configureCompareInput(2);


// -------- Compare files --------

$("compareButton").addEventListener("click", async () => {
    const file1 = $("compareFile1").files[0];
    const file2 = $("compareFile2").files[0];

    const error1 = validateFile(file1);
    const error2 = validateFile(file2);

    if (error1 || error2) {
        showMessage(
            "compareMessage",
            error1 || error2
        );
        return;
    }

    clearMessage("compareMessage");

    const button = $("compareButton");

    setBusy(
        button,
        true,
        "Comparing files...",
        "Compare Files →"
    );

    try {
        const formData = new FormData();

        formData.append("file1", file1);
        formData.append("file2", file2);

        const response = await fetch("/api/compare", {
            method: "POST",
            body: formData
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "File comparison failed.");
        }

        const result = $("compareResult");

        result.classList.remove("hidden", "different");

        if (data.identical) {
            result.textContent =
                "✓ FILES HAVE IDENTICAL CONTENTS";
        } else {
            result.textContent =
                "✕ FILES HAVE DIFFERENT CONTENTS";

            result.classList.add("different");
        }

    } catch (error) {
        showMessage("compareMessage", error.message);

    } finally {
        setBusy(
            button,
            false,
            "",
            "Compare Files →"
        );
    }
});

