async function descargarPDF() {
    const btn = document.getElementById('btnDescarga');
    const barra = document.getElementById('barra-descarga');
    btn.textContent = 'Generando...';
    btn.disabled = true;

    try {
        const { jsPDF } = window.jspdf;
        const contenido = document.getElementById('contenido-pdf');

        // Ocultar barra y forzar ancho A4 durante captura
        barra.style.display = 'none';
        document.body.style.paddingTop = '0';
        const anchoOriginal = contenido.style.width;
        contenido.style.width = '794px';
        contenido.style.minWidth = '794px';
        contenido.style.maxWidth = '794px';

        const canvas = await html2canvas(contenido, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff',
            logging: false,
            width: 794,
            windowWidth: 794,
            scrollY: 0,
            scrollX: 0,
            onclone: function(doc) {
                // Asegurar que el footer sea estático durante la captura
                const footer = doc.querySelector('.footer');
                if (footer) {
                    footer.style.position = 'static';
                    footer.style.marginTop = '20px';
                }
            }
        });

        // Restaurar estilos
        contenido.style.width = anchoOriginal;
        contenido.style.minWidth = '';
        contenido.style.maxWidth = '';
        barra.style.display = 'flex';
        document.body.style.paddingTop = '55px';

        const imgData = canvas.toDataURL('image/jpeg', 0.98);

        // PDF A4 vertical: 210mm x 297mm
        const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageW = 210;
        const pageH = 297;
        const margin = 8;
        const contentW = pageW - margin * 2;
        const contentH = pageH - margin * 2;

        // Alto proporcional de la imagen en mm
        const imgH = (canvas.height * contentW) / canvas.width;

        let heightLeft = imgH;
        let page = 0;

        while (heightLeft > 0) {
            if (page > 0) pdf.addPage();
            const offsetY = page * contentH;
            pdf.addImage(imgData, 'JPEG', margin, margin - offsetY, contentW, imgH);
            heightLeft -= contentH;
            page++;
        }

        const filename = document.getElementById('pdf-filename').value;
        pdf.save(filename);

    } catch (error) {
        console.error('Error generando PDF:', error);
        alert('Error al generar PDF: ' + error.message);
    } finally {
        btn.textContent = '⬇️ Descargar PDF';
        btn.disabled = false;
    }
}

window.addEventListener('load', function() {
    const esMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (esMobile) setTimeout(descargarPDF, 1500);
});
