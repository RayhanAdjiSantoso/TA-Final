import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const PDF = {
  // Fungsi untuk download PDF dari analisis
  downloadAnalisisPDF: async (selectedAnalisis, previewVisualisasi) => {
    if (!selectedAnalisis) {
      alert('Pilih salah satu analisis');
      return false;
    }

    // p: portrait, mm: unit pengukuran dalam milimeter, a4: ukuran kertas
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    // Konstanta untuk margin dan ukuran halaman
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const marginLeft = 20;
    const marginRight = 20;
    const marginTop = 20;
    const marginBottom = 20;
    const contentWidth = pageWidth - marginLeft - marginRight;
    const maxContentHeight = pageHeight - marginBottom;
    
    let yPosition = marginTop;

    // Fungsi helper untuk cek apakah perlu halaman baru
    const checkAndAddPage = (requiredHeight) => {
      if (yPosition + requiredHeight > maxContentHeight) {
        pdf.addPage();
        yPosition = marginTop;
        return true;
      }
      return false;
    };

    try {
      // Judul dokumen (multi-line jika panjang)
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      
      // Split judul jika terlalu panjang
      const judulLines = pdf.splitTextToSize(selectedAnalisis.judul, contentWidth);
      const judulHeight = judulLines.length * 8;
      
      // Cek apakah judul muat di halaman
      checkAndAddPage(judulHeight);
      
      // Center align judul (baris pertama saja untuk centered, sisanya left align)
      if (judulLines.length === 1) {
        const textWidth = pdf.getTextWidth(judulLines[0]);
        const xCentered = (pageWidth - textWidth) / 2;
        pdf.text(judulLines[0], xCentered, yPosition);
      } else {
        // Jika multi-line, gunakan left align
        pdf.text(judulLines, marginLeft, yPosition);
      }
      
      yPosition += judulHeight + 5;

      // Rumusan Masalah
      checkAndAddPage(20); // Cek space untuk header
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Rumusan Masalah:', marginLeft, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const splitRumusan = pdf.splitTextToSize(selectedAnalisis.masalah || '-', contentWidth);
      const rumusanHeight = splitRumusan.length * 7;
      
      // Cek apakah rumusan masalah muat
      if (checkAndAddPage(rumusanHeight)) {
        // Jika pindah halaman, tulis ulang header
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Rumusan Masalah (lanjutan):', marginLeft, yPosition);
        yPosition += 10;
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
      }
      
      pdf.text(splitRumusan, marginLeft, yPosition);
      yPosition += rumusanHeight + 10;

      // Visualisasi
      checkAndAddPage(20); // Cek space untuk header
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Visualisasi:', marginLeft, yPosition);
      yPosition += 10;

      for (let i = 0; i < previewVisualisasi.length; i++) {
        const vis = previewVisualisasi[i];
        const chartElement = document.getElementById(`chart-${vis.id_visualisasi}`);
        
        if (chartElement) {
          const canvas = await html2canvas(chartElement, {
            scale: 2, // Meningkatkan kualitas gambar
            backgroundColor: '#ffffff'
          });
          
          const imgData = canvas.toDataURL('image/png');
          const imgWidth = contentWidth;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const titleHeight = 10;
          const totalHeight = titleHeight + imgHeight;
          
          // Cek apakah visualisasi muat di halaman saat ini
          if (checkAndAddPage(totalHeight)) {
            // Jika pindah halaman, beri header
            pdf.setFontSize(14);
            pdf.setFont('helvetica', 'bold');
            pdf.text(`Visualisasi (lanjutan):`, marginLeft, yPosition);
            yPosition += 10;
          }
          
          // Judul visualisasi
          pdf.setFontSize(12);
          pdf.setFont('helvetica', 'bold');
          const judulVis = pdf.splitTextToSize(vis.judul, contentWidth);
          pdf.text(judulVis, marginLeft, yPosition);
          yPosition += judulVis.length * 7;
          
          // Gambar chart
          pdf.addImage(imgData, 'PNG', marginLeft, yPosition, imgWidth, imgHeight);
          yPosition += imgHeight + 10;
          
          // Tambahkan spacing antar visualisasi
          if (i < previewVisualisasi.length - 1) {
            yPosition += 5;
          }
        }
      }

      // Interpretasi Hasil
      checkAndAddPage(20); // Cek space untuk header
      
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Interpretasi Hasil:', marginLeft, yPosition);
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      const splitInterpretasi = pdf.splitTextToSize(
        selectedAnalisis.interpretasi_hasil || '-', 
        contentWidth
      );
      const interpretasiHeight = splitInterpretasi.length * 7;
      
      // Cek apakah interpretasi muat
      if (checkAndAddPage(interpretasiHeight)) {
        // Jika pindah halaman, tulis ulang header
        pdf.setFontSize(14);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Interpretasi Hasil (lanjutan):', marginLeft, yPosition);
        yPosition += 10;
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'normal');
      }
      
      pdf.text(splitInterpretasi, marginLeft, yPosition);

      // Tambahkan nomor halaman di footer
      const pageCount = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        pdf.setPage(i);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'normal');
        pdf.text(
          `Halaman ${i} dari ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Sanitasi nama file
      const fileName = `Analisis_${selectedAnalisis.judul
        .replace(/[^a-zA-Z0-9]/g, '_')
        .substring(0, 50)}.pdf`;
      
      pdf.save(fileName);
      return true;
      
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Gagal membuat PDF. Silakan coba lagi.');
      return false;
    }
  }
};

export default PDF;