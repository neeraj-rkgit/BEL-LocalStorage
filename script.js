let nodes = [];
let network;
let employeeMap = {};
let uploadedFile = null;

document.getElementById('upload').addEventListener('change', function (e) {
  uploadedFile = e.target.files[0];
  handleFile(e);
});

document.getElementById('close').onclick = () => {
  document.getElementById('popup').style.display = 'none';
};

document.getElementById('toggleTheme').addEventListener('change', () => {
  document.body.classList.toggle('dark-mode');
});

document.getElementById('searchBox').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') {
    searchNode();
  }
});

window.onload = function () {
  const storedData = localStorage.getItem("orgData");
  if (storedData) {
    drawTree(JSON.parse(storedData));
  } else {
    fetchDefaultExcel();
  }

  const fileData = localStorage.getItem("orgFile");
  const fileName = localStorage.getItem("orgFileName");
  if (fileData && fileName) {
    const byteString = atob(fileData.split(',')[1]);
    const mimeString = fileData.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    uploadedFile = new File([ab], fileName, { type: mimeString });
  }
};

function fetchDefaultExcel() {
  fetch('Employee_details.xlsx')
    .then(response => response.arrayBuffer())
    .then(buffer => {
      const data = new Uint8Array(buffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const cleaned = raw.map(row => {
        const norm = {};
        Object.keys(row).forEach(k => {
          const cleanKey = k.replace(/\u00A0/g, ' ').trim();
          norm[cleanKey] = typeof row[k] === "string" ? row[k].trim() : row[k];
        });
        return norm;
      });

      localStorage.setItem("orgData", JSON.stringify(cleaned));
      drawTree(cleaned);
    });
}

function handleFile(e) {
  const file = e.target.files[0];
  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: "" });

    const cleaned = raw.map(row => {
      const norm = {};
      Object.keys(row).forEach(k => {
        const cleanKey = k.replace(/\u00A0/g, ' ').trim();
        norm[cleanKey] = typeof row[k] === "string" ? row[k].trim() : row[k];
      });
      return norm;
    });

    localStorage.setItem("orgData", JSON.stringify(cleaned));

    const readerForFile = new FileReader();
    readerForFile.onload = function () {
      localStorage.setItem("orgFile", readerForFile.result);
      localStorage.setItem("orgFileName", file.name);
    };
    readerForFile.readAsDataURL(file);

    drawTree(cleaned);
  };
  reader.readAsArrayBuffer(file);
}

function drawTree(data) {
  const edges = [];
  const staffNoMap = {};
  nodes = [];
  employeeMap = {};

const colorMap = {};
const colorPalette = [
  "#f28b82", "#fbbc04", "#fff475", "#ccff90", "#a7ffeb",
  "#cbf0f8", "#aecbfa", "#d7aefb", "#fdcfe8", "#e6c9a8", "#e8eaed"
];
let colorIndex = 0;

data.forEach((emp) => {
  const id = emp["Staff No"];
  const designation = emp["Designation"] || "Unknown";
  staffNoMap[id] = true;
  employeeMap[id] = emp;

  if (!colorMap[designation]) {
    colorMap[designation] = colorPalette[colorIndex % colorPalette.length];
    colorIndex++;
  }

  nodes.push({
    id: id,
    label: `${emp["Employee Name"]}\n(${designation})`,
    shape: "box",
    font: { size: 18 },
    margin: 12,
    widthConstraint: { minimum: 180 },
    heightConstraint: { minimum: 70 },
    color: {
      background: colorMap[designation],
      border: "#333",
      highlight: {
        background: "#cde4ff",
        border: "#2b7ce9"
      }
    }
  });
});


  data.forEach((emp) => {
    const from = emp["Parent"];
    const to = emp["Staff No"];
    if (from && staffNoMap[from]) {
      edges.push({ from, to });
    }
  });

  const container = document.getElementById("network");
  const visData = {
    nodes: new vis.DataSet(nodes),
    edges: new vis.DataSet(edges),
  };

  const options = {
    layout: {
      hierarchical: {
        enabled: true,
        direction: "UD",
        levelSeparation: 200,
        nodeSpacing: 250
      }
    },
    autoResize: false,
    interaction: {
      dragNodes: false,
      dragView: true,
      zoomView: false,
      selectable: true,
      hover: true
    },
    nodes: {
      borderWidth: 1,
      shape: "box",
      color: {
        border: "#333",
        background: "#dee3fa",
        highlight: { border: "#2b7ce9", background: "#cde4ff" }
      },
      font: { size: 18 }
    },
    edges: {
      arrows: { to: true },
      color: "#555"
    },
    physics: false
  };

  network = new vis.Network(container, visData, options);

  network.on("click", function (params) {
    if (params.nodes.length > 0) {
      const id = params.nodes[0];
      const emp = employeeMap[id];

      const roleMap = {
        "1": "Team Member",
        "2": "Lead",
        "3": "Project Manager"
      };

      const getProjectRole = (pKey, rKey) => {
        const project = String(emp[pKey] ?? "").trim();
        const role = String(emp[rKey] ?? "").trim();
        if (project === "1" && roleMap[role]) {
          return `✔️ ${roleMap[role]}`;
        }
        return "—";
      };

      document.getElementById("popupDetails").innerHTML = `
        <hr>
        <h3>${emp["Employee Name"]}</h3>
        <p><strong>Designation:</strong> ${emp["Designation"]}</p>
        <p><strong>Staff No:</strong> ${emp["Staff No"]}</p>
        <p><strong>Reports To:</strong> ${emp["Parent"] || "None"}</p>
        <p><strong>S No:</strong> ${emp["S No."] || emp["S.No"] || "—"}</p>
        <hr>
        <p><strong>Project-1:</strong> ${getProjectRole("Project-1", "Role-1")}</p>
        <p><strong>Project-2:</strong> ${getProjectRole("Project-2", "Role-2")}</p>
        <p><strong>Project-3:</strong> ${getProjectRole("Project-3", "Role-3")}</p>
        <hr>
        <p><strong>Department:</strong> ${emp["Department"] || "None"}</p>
        <p><strong>Phone No:</strong> ${emp["Phone"] || "—"}</p>
      `;
      document.getElementById("popup").style.display = "block";
    }
  });
}

// ✅ Enhanced search: by Employee Name or Staff No
function searchNode() {
  const input = document.getElementById("searchBox").value.trim().toLowerCase();
  if (!input) return;

  const found = nodes.find(n => {
    const emp = employeeMap[n.id];
    const nameMatch = emp["Employee Name"]?.toLowerCase().includes(input);
    const staffNoMatch = String(emp["Staff No"]).toLowerCase().includes(input);
    return nameMatch || staffNoMatch;
  });

  if (found) {
    network.selectNodes([found.id]);
    network.focus(found.id, {
      scale: 1.5,
      animation: {
        duration: 800,
        easingFunction: "easeInOutQuad"
      }
    });
  } else {
    alert("No match found for employee name or staff number.");
  }
}

function resetView() {
  network.fit({ animation: true });
  network.unselectAll();
}

function zoomIn() {
  const scale = network.getScale();
  network.moveTo({ scale: scale + 0.2 });
}

function zoomOut() {
  const scale = network.getScale();
  network.moveTo({ scale: scale - 0.2 });
}

function toggleFullScreen() {
  const elem = document.documentElement;
  if (!document.fullscreenElement) {
    elem.requestFullscreen().catch(err => {
      alert(`Error trying to enable full-screen: ${err.message}`);
    });
  } else {
    document.exitFullscreen();
  }
}

function downloadExcel() {
  const link = document.createElement("a");
  link.href = "Employee_details.xlsx";
  link.download = "Employee_details.xlsx";
  link.click();
}

function clearLocalData() {
  localStorage.removeItem("orgData");
  localStorage.removeItem("orgFile");
  localStorage.removeItem("orgFileName");
  alert("Local data cleared. Refreshing...");
  location.reload();
}

// filter employees by designation and download as Excel
function downloadFilteredByDesignation() {
  const input = document.getElementById("designationFilter").value.trim().toLowerCase();
  if (!input) {
    alert("Please enter a designation.");
    return;
  }

  const allData = Object.values(employeeMap);
  const filtered = allData.filter(emp =>
    (emp["Designation"] || "").toLowerCase().includes(input)
  );

  if (filtered.length === 0) {
    alert("No employee found with that designation.");
    return;
  }

  const sheet = XLSX.utils.json_to_sheet(filtered);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Filtered_Employees");

  XLSX.writeFile(workbook, `Employees_${input}.xlsx`);
}

