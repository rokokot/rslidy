import { print_settings_html } from "./html-definitions";

interface Data {
  links: boolean;
  slidenumbers: boolean;
  frame: boolean;
  font_size: string;
  layout: string;
  paperSize: string;
  // NEW: Beamer-specific settings
  exportFormat: string;
  showAllContent: boolean;
  pageBreakOption: string;
}

export class PrintSettingsComponent {
  private view: HTMLElement;
  public style: HTMLStyleElement;
  private isBeamerMode: boolean = false;

  constructor() {
    this.view = window.rslidy.utils.prependHtmlString(document.body, print_settings_html);

    this.initializeSlideRangeToggle();
    this.initializeBeamerExport(); // NEW: Initialize beamer functionality

    // Set default values
    (<HTMLInputElement>this.view.querySelector("#rslidy-checkbox-snum")).checked = true;
    (<HTMLInputElement>this.view.querySelector("#rslidy-checkbox-frame")).checked = true;
    (<HTMLInputElement>this.view.querySelector("#rslidy-checkbox-link")).checked = false;

    // Apply print settings on change
    const inputs = this.view.getElementsByTagName("input");
    for (let i = 0; i < inputs.length; i++) {
      inputs[i].onchange = () => this.applyPrintSettings();
    }

    // Close menu on selection
    const elementsToCloseOn = [
      "#rslidy-checkbox-link",
      "#rslidy-checkbox-snum",
      "#rslidy-checkbox-frame",
      "#rslidy-input-font-size",
      "#rslidy-button-print-submit"
    ];
    elementsToCloseOn.forEach(selector => {
      this.view.querySelector(selector)?.addEventListener("click",
        e => window.rslidy.toolbar.closeMenuOnSelection());
    });

    // Print button handler
    this.view.querySelector("#rslidy-button-print-submit")
      ?.addEventListener("click", e => this.print());

    this.applyPrintSettings();
  }

  // NEW: Initialize beamer export functionality
  private initializeBeamerExport() {
    console.log('Initializing beamer export...');
    
    const exportRadios = this.view.querySelectorAll('input[name="export-format"]');
    const beamerOptions = this.view.querySelector('#rslidy-beamer-options');
    const exportButton = this.view.querySelector('#rslidy-button-export-beamer');

    console.log('Found elements:', {
      exportRadios: exportRadios.length,
      beamerOptions: !!beamerOptions,
      exportButton: !!exportButton
    });

    if (!exportRadios.length) {
      console.error("Export format radio buttons not found!");
      return;
    }
    if (!beamerOptions) {
      console.error("Beamer options container not found!");
      return;
    }
    if (!exportButton) {
      console.error("Export beamer button not found!");
      return;
    }

    // Toggle beamer options visibility
    exportRadios.forEach((radio, index) => {
      console.log(`Setting up radio ${index}:`, (radio as HTMLInputElement).value);
      
      radio.addEventListener('change', () => {
        const value = (radio as HTMLInputElement).value;
        console.log(`Export format changed to: ${value}`);
        
        this.isBeamerMode = value === 'beamer';
        
        if (this.isBeamerMode) {
          console.log('Showing beamer options...');
          beamerOptions.classList.remove('rslidy-hidden');
        } else {
          console.log('Hiding beamer options...');
          beamerOptions.classList.add('rslidy-hidden');
        }
      });
    });

    // Beamer export button
    exportButton.addEventListener('click', (e) => {
      e.preventDefault();
      console.log('Beamer export button clicked!');
      this.exportBeamerPDF();
      window.rslidy.toolbar.closeMenuOnSelection();
    });

    // Close menu on beamer settings change
    this.view.querySelector('#rslidy-checkbox-show-all')?.addEventListener('click',
      () => window.rslidy.toolbar.closeMenuOnSelection());
    
    const pageBreakRadios = this.view.querySelectorAll('input[name="page-break"]');
    pageBreakRadios.forEach(radio => {
      radio.addEventListener('click', () => window.rslidy.toolbar.closeMenuOnSelection());
    });

    console.log('Beamer export initialization complete');
  }

  // NEW: Get current page break option
  private getPageBreakOption(): string {
    const selectedOption = this.view.querySelector('input[name="page-break"]:checked') as HTMLInputElement;
    return selectedOption ? selectedOption.value : 'force-fit';
  }

  // NEW: Generate beamer-specific CSS
  private generateBeamerCSS(): string {
    const pageBreakOption = this.getPageBreakOption();
    
    return `
      @media print {
        @page {
          size: 16in 9in; /* 16:9 aspect ratio */
          margin: 0.5in;
        }
        
        body {
          font-family: 'Computer Modern', 'Latin Modern', serif;
          color: black !important;
          background: white !important;
        }
        
        .slide {
          width: 15in !important;
          min-height: 8in !important;
          max-height: ${pageBreakOption === 'auto-break' ? 'none' : '8in'} !important;
          margin: 0 auto !important;
          padding: 0.5in !important;
          box-sizing: border-box !important;
          border: 1px solid #ddd;
          
          ${pageBreakOption === 'force-fit' ? 
            'page-break-after: always !important; page-break-inside: avoid !important; overflow: hidden !important;' :
            'page-break-after: avoid !important; page-break-inside: auto !important;'
          }
        }
        
        /* Force show all incremental content */
        .rslidy-invisible {
          visibility: visible !important;
          display: block !important;
        }
        
        /* Beamer-style typography */
        .slide h1 {
          font-size: 1.5em !important;
          color: #003366 !important;
          border-bottom: 2px solid #003366 !important;
          padding-bottom: 0.2em !important;
          margin-bottom: 0.5em !important;
          page-break-after: avoid !important;
        }
        
        .slide h2, .slide h3 {
          page-break-after: avoid !important;
          margin-top: 1em !important;
          color: #003366 !important;
        }
        
        /* Enhanced bullet points */
        .slide ul, .slide ol {
          ${pageBreakOption === 'force-fit' ? 
            'page-break-inside: avoid !important;' :
            'page-break-inside: auto !important;'
          }
        }
        
        .slide li {
          margin-bottom: 0.3em !important;
          line-height: 1.4 !important;
        }
        
        /* Code blocks styling */
        .slide pre {
          background: #f5f5f5 !important;
          border: 1px solid #ddd !important;
          padding: 0.5em !important;
          font-family: 'Courier New', monospace !important;
          page-break-inside: avoid !important;
          margin: 1em 0 !important;
        }
        
        /* Hide UI elements */
        .rslidy-ui {
          display: none !important;
        }
      }
    `;
  }

  // NEW: Main beamer export function
  private async exportBeamerPDF() {
    console.log('Starting Beamer PDF export...');
    
    try {
      // Force show all incremental content if option is checked
      const showAllCheckbox = this.view.querySelector('#rslidy-checkbox-show-all') as HTMLInputElement;
      if (showAllCheckbox && showAllCheckbox.checked) {
        console.log('Forcing all incremental content to show...');
        window.rslidy.content.forceShowAllIncrementalContent();
      }
      
      // Apply beamer CSS
      console.log('Applying beamer CSS...');
      const beamerStyle = document.createElement('style');
      beamerStyle.id = 'rslidy-beamer-style';
      beamerStyle.innerHTML = this.generateBeamerCSS();
      document.head.appendChild(beamerStyle);
      
      // Wait for styles to apply
      await new Promise(resolve => setTimeout(resolve, 500));
      
      console.log('Opening print dialog...');
      
      // Trigger print
      window.print();
      
      // Cleanup after a delay
      setTimeout(() => {
        console.log('Cleaning up beamer export...');
        const beamerStyleEl = document.getElementById('rslidy-beamer-style');
        if (beamerStyleEl) document.head.removeChild(beamerStyleEl);
        console.log('Beamer export cleanup complete');
      }, 2000);
      
    } catch (error) {
      console.error('Beamer export failed:', error);
      alert('Beamer export failed. Please check the console for details.');
    }
  }

  // Existing methods below (keeping all the original functionality)

  private initializeSlideRangeToggle() {
    const slideRadios = this.view.querySelectorAll('input[name="slide-print-option"]');
    const rangeInput = <HTMLInputElement>this.view.querySelector("#rslidy-slide-range-input");
    const customZoomRadio = <HTMLInputElement>this.view.querySelector('#rslidy-checkbox-zoom');
    const zoomInput = <HTMLInputElement>this.view.querySelector('#custom-zoom-input');

    if (!slideRadios.length || !rangeInput) {
      console.error("Print settings elements not found!");
      return;
    }

    const updateStates = () => {
      const checkedSlideRadio = this.view.querySelector(
        'input[name="slide-print-option"]:checked'
      ) as HTMLInputElement | null;

      const isCustomSlide = checkedSlideRadio?.value === "custom";
      const isCustomZoom = customZoomRadio?.checked || false;

      rangeInput.disabled = !isCustomSlide;
      if (zoomInput) zoomInput.disabled = !isCustomZoom;
    };

    updateStates();

    slideRadios.forEach(radio => {
      radio.addEventListener("change", updateStates);
    });

    document.querySelectorAll('input[name="print-options"]').forEach(radio => {
      radio.addEventListener("change", updateStates);
    });
  }

  private applyPrintSettings() {
    // Skip applying standard print settings if in beamer mode
    if (this.isBeamerMode) {
      return;
    }

    if (this.style) {
      document.head.removeChild(this.style);
    }

    const link = <HTMLInputElement>this.view.querySelector("#rslidy-checkbox-link");
    const snum = <HTMLInputElement>this.view.querySelector("#rslidy-checkbox-snum");
    const frame = <HTMLInputElement>this.view.querySelector("#rslidy-checkbox-frame");
    const font_size = <HTMLInputElement>this.view.querySelector("#rslidy-input-font-size");
    const layout = <HTMLSelectElement>this.view.querySelector("#rslidy-select-orientation");
    const paperSize = <HTMLSelectElement>this.view.querySelector("#rslidy-select-paper-size");
    const selectedSlideOption = <HTMLInputElement>this.view.querySelector('input[name="slide-print-option"]:checked');
    const slideRangeInput = <HTMLInputElement>this.view.querySelector("#rslidy-slide-range-input");

    let css = "@media print {\n";

    // Handle slide visibility
    if (selectedSlideOption?.value === "custom") {
      const range = this.parseSlideRange(slideRangeInput.value);
      css += this.applyCustomSlideRange(range);
    } else if (selectedSlideOption?.value === "current") {
      css += this.applyCurrentSlideOnly();
    }

    // Paper size and orientation
    const isValidFormat = /^\d+(mm|in)\s\d+(mm|in)$/.test(paperSize.value);
    if (!isValidFormat) {
      console.error("Invalid paper size format");
      return;
    }

    let dimensions = paperSize.value;
    if (layout.value === "landscape") {
      const [width, height] = dimensions.split(" ");
      dimensions = `${height} ${width}`;
    }

    css += `
      .slide { margin: auto !important; }
      @page { size: ${dimensions}; }
    `;

    // Additional print settings
    if (!link.checked) {
      css += `a[href^="http://"]:after, a[href^="https://"]:after { content: "" !important; }`;
    }

    if (snum.checked) {
      css += `
        #rslidy-content-section { counter-reset: slide-counter; }
        #rslidy-content-section .slide:after {
          content: counter(slide-counter);
          counter-increment: slide-counter;
          position: absolute;
          right: 0.8rem;
          bottom: 0.8rem;
          font: 60% Sans-Serif;
        }
      `;
    }

    if (frame.checked) {
      css += `.slide { border: ${window.rslidy.print_frame}; }`;
    }

    if (font_size.value != "") {
      css += `body { font-size: ${font_size.value}%; }`;
    }

    css += "\n}";

    // Inject CSS
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = css;
    document.head.appendChild(style);
    this.style = style;
  }

  private parseSlideRange(input: string): number[] {
    return input.split(',').reduce<number[]>((acc, part) => {
      if (part.includes('-')) {
        const [start, end] = part.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          for (let i = start; i <= end; i++) acc.push(i);
        }
      } else {
        const num = Number(part);
        if (!isNaN(num)) acc.push(num);
      }
      return acc;
    }, []);
  }

  private applyCustomSlideRange(range: number[]): string {
    const slides = document.querySelectorAll("#rslidy-content-section .slide");
    const totalSlides = slides.length;
    const validRange = range.filter(num => num >= 1 && num <= totalSlides);

    const visibleSlides = validRange
      .map(num => `#rslidy-content-section .slide:nth-of-type(${num}) { display: block !important; }`)
      .join("\n");

    return `
      #rslidy-content-section .slide { display: none !important; }
      ${visibleSlides}
    `;
  }

  private applyCurrentSlideOnly(): string {
    const currentSlideIndex = window.rslidy.content.getCurrentSlideIndex();
    return `
      #rslidy-content-section .slide { display: none !important; }
      #rslidy-content-section .slide:nth-of-type(${currentSlideIndex + 1}) { display: block !important; }
    `;
  }

  public print() {
    try {
      this.applyPrintSettings();
      const slides = document.querySelectorAll("#rslidy-content-section .slide");
      const originalHiddenSlides = new Set();

      slides.forEach(slide => {
        if (slide.classList.contains("rslidy-hidden")) {
          originalHiddenSlides.add(slide);
          slide.classList.remove("rslidy-hidden");
        }
      });

      setTimeout(() => {
        window.print();

        slides.forEach(slide => {
          if (originalHiddenSlides.has(slide)) {
            slide.classList.add("rslidy-hidden");
          }
        });
      }, 200);
    } catch (e) {
      console.error("Print error:", e);
    }
  }

  public loadSettings(): void {
    try {
      const item = localStorage.getItem("rslidy-print");
      if (!item) return;

      const data: Data = JSON.parse(item);
      (<HTMLInputElement>this.view.querySelector("#rslidy-checkbox-link")).checked = data.links;
      (<HTMLInputElement>this.view.querySelector("#rslidy-checkbox-snum")).checked = data.slidenumbers;
      (<HTMLInputElement>this.view.querySelector("#rslidy-checkbox-frame")).checked = data.frame;

      if (data.font_size) {
        (<HTMLInputElement>this.view.querySelector("#rslidy-input-font-size")).value = data.font_size;
      }
      if (data.layout) {
        (<HTMLSelectElement>this.view.querySelector("#rslidy-select-orientation")).value = data.layout;
      }
      if (data.paperSize) {
        (<HTMLSelectElement>this.view.querySelector("#rslidy-select-paper-size")).value = data.paperSize;
      }

      // NEW: Load beamer settings
      if (data.exportFormat) {
        const exportRadio = this.view.querySelector(`input[name="export-format"][value="${data.exportFormat}"]`) as HTMLInputElement;
        if (exportRadio) {
          exportRadio.checked = true;
          // Trigger change event to show/hide beamer options
          exportRadio.dispatchEvent(new Event('change'));
        }
      }
      if (data.showAllContent !== undefined) {
        (<HTMLInputElement>this.view.querySelector("#rslidy-checkbox-show-all")).checked = data.showAllContent;
      }
      if (data.pageBreakOption) {
        const pageBreakRadio = this.view.querySelector(`input[name="page-break"][value="${data.pageBreakOption}"]`) as HTMLInputElement;
        if (pageBreakRadio) pageBreakRadio.checked = true;
      }

      this.applyPrintSettings();
    } catch (e) {
      console.error("Error loading settings:", e);
    }
  }

  public saveSettings(): void {
    try {
      localStorage.setItem("rslidy-print", this.generateJSON());
    } catch (e) {
      console.error("Error saving settings:", e);
    }
  }

  private generateJSON(): string {
    const exportFormatRadio = this.view.querySelector('input[name="export-format"]:checked') as HTMLInputElement;
    const pageBreakRadio = this.view.querySelector('input[name="page-break"]:checked') as HTMLInputElement;
    
    return JSON.stringify({
      links: (<HTMLInputElement>this.view.querySelector("#rslidy-checkbox-link")).checked,
      slidenumbers: (<HTMLInputElement>this.view.querySelector("#rslidy-checkbox-snum")).checked,
      frame: (<HTMLInputElement>this.view.querySelector("#rslidy-checkbox-frame")).checked,
      font_size: (<HTMLInputElement>this.view.querySelector("#rslidy-input-font-size")).value,
      layout: (<HTMLSelectElement>this.view.querySelector("#rslidy-select-orientation")).value,
      paperSize: (<HTMLSelectElement>this.view.querySelector("#rslidy-select-paper-size")).value,
      // NEW: Beamer settings
      exportFormat: exportFormatRadio ? exportFormatRadio.value : 'standard',
      showAllContent: (<HTMLInputElement>this.view.querySelector("#rslidy-checkbox-show-all"))?.checked || true,
      pageBreakOption: pageBreakRadio ? pageBreakRadio.value : 'force-fit'
    });
  }
}