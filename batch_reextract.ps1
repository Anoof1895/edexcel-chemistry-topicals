$targets = @(
    @{ Unit="WCH14"; Series="2025 June" },
    @{ Unit="WCH12"; Series="2021 June" },
    @{ Unit="WCH15"; Series="2021 June" },
    @{ Unit="WCH15"; Series="2023 Jan" },
    @{ Unit="WCH15"; Series="2025 June" },
    @{ Unit="WCH15"; Series="2024 June" },
    @{ Unit="WCH15"; Series="2023 Oct" },
    @{ Unit="WCH15"; Series="2025 Oct" },
    @{ Unit="WCH15A"; Series="2025 Oct" },
    @{ Unit="WCH15"; Series="2020 Oct" },
    @{ Unit="WCH14"; Series="2025 Jan" },
    @{ Unit="WCH15"; Series="2024 Oct" },
    @{ Unit="WCH11"; Series="2020 Oct" },
    @{ Unit="WCH12A"; Series="2026 Jan" },
    @{ Unit="WCH12"; Series="2025 June" },
    @{ Unit="WCH12"; Series="2024 June" },
    @{ Unit="WCH14"; Series="2024 Jan" },
    @{ Unit="WCH14"; Series="2023 June" },
    @{ Unit="WCH14"; Series="2021 Jan" }
)

$i = 0
$total = $targets.Count

foreach ($t in $targets) {
    $i++
    Write-Host "==========================================================" -ForegroundColor Cyan
    Write-Host "[$i / $total] Extracting $($t.Unit) - $($t.Series)..." -ForegroundColor Cyan
    Write-Host "==========================================================" -ForegroundColor Cyan
    .\.venv\Scripts\python.exe -m pipeline.extract --unit $t.Unit --series $t.Series --force
}
