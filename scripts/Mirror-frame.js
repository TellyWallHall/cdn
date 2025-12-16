    const wemjnonmomo = {};const app = firebase.initializeApp(wemjnonmomo);const db = firebase.database();

    const frame = document.getElementById("mirrorFrame");
    const menuBtn = document.getElementById("menuBtn");
    const menu = document.getElementById("menu");
    const uploadBtn = document.getElementById("uploadBtn");
    const downloadBtn = document.getElementById("downloadBtn");
    const historyBtn = document.getElementById("historyBtn");
    const fileInput = document.getElementById("fileInput");


    menuBtn.addEventListener("click", () => {
      menu.style.display = menu.style.display === "flex" ? "none" : "flex";
    });


    async function loadLatestCode() {
      const snapshot = await db.ref("mirror/latest").get();
      if (snapshot.exists()) {
        const html = snapshot.val();
        frame.srcdoc = html;
      } else {
        frame.srcdoc = "<h2>No code found</h2>";
      }
    }


    uploadBtn.addEventListener("click", () => fileInput.click());


    fileInput.addEventListener("change", async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const text = await file.text();
      const newRef = db.ref("mirror/history").push();
      await newRef.set(text);
      await db.ref("mirror/latest").set(text);
      frame.srcdoc = text;
      alert("Code uploaded successfully!");
    });


    downloadBtn.addEventListener("click", async () => {
      const snapshot = await db.ref("mirror/latest").get();
      if (!snapshot.exists()) return alert("No code to download");
      const html = snapshot.val();
      const blob = new Blob([html], { type: "text/html" });
      const file = new File([blob], "mirror.html", { type: "text/html" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: "Mirror Website",
          text: "Download the current website code",
          files: [file]
        });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "mirror.html";
        a.click();
        URL.revokeObjectURL(url);
      }
    });


    historyBtn.addEventListener("click", async () => {
      const snapshot = await db.ref("mirror/history").get();
      if (!snapshot.exists()) return alert("No previous versions found");
      const versions = snapshot.val();
      let list = Object.keys(versions).map((key, i) => `${i + 1}. Version ID: ${key}`).join("\n");
      const choice = prompt(`Select version number to load:\n${list}`);
      const keys = Object.keys(versions);
      const selected = versions[keys[choice - 1]];
      if (selected) frame.srcdoc = selected;
    });


    if (window.elementSdk) {
      window.elementSdk.init({
        defaultConfig: {},
        onConfigChange: async (config) => {},
        mapToCapabilities: (config) => ({
          recolorables: [],
          borderables: [],
          fontEditable: undefined,
          fontSizeable: undefined
        }),
        mapToEditPanelValues: (config) => new Map()
      });
    }


    loadLatestCode();