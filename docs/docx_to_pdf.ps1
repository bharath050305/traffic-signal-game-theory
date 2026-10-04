# Opens a .docx in Microsoft Word, refreshes the table of contents and page numbers, saves the .docx back and exports a PDF.
# Usage:  powershell -File docs\docx_to_pdf.ps1 docs\Traffic_Signal_Game_Theory_Report.docx
param([Parameter(Mandatory = $true)][string]$Path)
$full = (Resolve-Path $Path).Path
$pdf = [System.IO.Path]::ChangeExtension($full, '.pdf')
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
try {
    $doc = $word.Documents.Open($full)
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    $doc.Fields.Update() | Out-Null
    foreach ($toc in $doc.TablesOfContents) { $toc.Update() }
    $doc.Save()
    $doc.ExportAsFixedFormat($pdf, 17)   # 17 = wdExportFormatPDF
    "pages: " + $doc.ComputeStatistics(2)
    $doc.Close($false)
} finally { $word.Quit() }
"wrote $pdf"
