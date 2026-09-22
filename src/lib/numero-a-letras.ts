// Utility to convert numbers to Spanish currency words (Colombian Pesos M/CTE)

function Unidades(num: number): string {
  switch (num) {
    case 1: return "UN";
    case 2: return "DOS";
    case 3: return "TRES";
    case 4: return "CUATRO";
    case 5: return "CINCO";
    case 6: return "SEIS";
    case 7: return "SIETE";
    case 8: return "OCHO";
    case 9: return "NUEVE";
    default: return "";
  }
}

function DecenasY(strSin: string, numUnidades: number): string {
  if (numUnidades > 0) return `${strSin} Y ${Unidades(numUnidades)}`;
  return strSin;
}

function Decenas(num: number): string {
  const decena = Math.floor(num / 10);
  const unidad = num - decena * 10;

  switch (decena) {
    case 1:
      switch (unidad) {
        case 0: return "DIEZ";
        case 1: return "ONCE";
        case 2: return "DOCE";
        case 3: return "TRECE";
        case 4: return "CATORCE";
        case 5: return "QUINCE";
        default: return `DIECI${Unidades(unidad)}`;
      }
    case 2:
      switch (unidad) {
        case 0: return "VEINTE";
        default: return `VEINTI${Unidades(unidad)}`;
      }
    case 3: return DecenasY("TREINTA", unidad);
    case 4: return DecenasY("CUARENTA", unidad);
    case 5: return DecenasY("CINCUENTA", unidad);
    case 6: return DecenasY("SESENTA", unidad);
    case 7: return DecenasY("SETENTA", unidad);
    case 8: return DecenasY("OCHENTA", unidad);
    case 9: return DecenasY("NOVENTA", unidad);
    case 0: return Unidades(unidad);
    default: return "";
  }
}

function Centenas(num: number): string {
  const centenas = Math.floor(num / 100);
  const decenas = num - centenas * 100;

  switch (centenas) {
    case 1:
      if (decenas > 0) return `CIENTO ${Decenas(decenas)}`;
      return "CIEN";
    case 2: return `DOSCIENTOS ${Decenas(decenas)}`.trim();
    case 3: return `TRESCIENTOS ${Decenas(decenas)}`.trim();
    case 4: return `CUATROCIENTOS ${Decenas(decenas)}`.trim();
    case 5: return `QUINIENTOS ${Decenas(decenas)}`.trim();
    case 6: return `SEISCIENTOS ${Decenas(decenas)}`.trim();
    case 7: return `SETECIENTOS ${Decenas(decenas)}`.trim();
    case 8: return `OCHOCIENTOS ${Decenas(decenas)}`.trim();
    case 9: return `NOVECIENTOS ${Decenas(decenas)}`.trim();
    default: return Decenas(decenas);
  }
}

function Seccion(num: number, divisor: number, strSingular: string, strPlural: string): string {
  const cientos = Math.floor(num / divisor);
  const resto = num - cientos * divisor;

  let letras = "";
  if (cientos > 0) {
    if (cientos > 1) {
      letras = `${Centenas(cientos)} ${strPlural}`;
    } else {
      letras = strSingular;
    }
  }

  if (resto > 0) {
    letras = `${letras} `.trim();
  }

  return letras;
}

function Miles(num: number): string {
  const divisor = 1000;
  const cientos = Math.floor(num / divisor);
  const resto = num - cientos * divisor;

  const strMiles = Seccion(num, divisor, "UN MIL", "MIL");
  const strCentenas = Centenas(resto);

  if (strMiles === "") return strCentenas;
  return `${strMiles} ${strCentenas}`.trim();
}

function Millones(num: number): string {
  const divisor = 1000000;
  const cientos = Math.floor(num / divisor);
  const resto = num - cientos * divisor;

  const strMillones = Seccion(num, divisor, "UN MILLÓN", "MILLONES");
  const strMiles = Miles(resto);

  if (strMillones === "") return strMiles;
  return `${strMillones} ${strMiles}`.trim();
}

export function numeroALetrasCOP(num: number | string | null | undefined): string {
  const numeric = typeof num === "string" ? parseFloat(num.replace(/[^0-9.-]+/g, "")) : Number(num);
  if (isNaN(numeric) || numeric === 0) return "CERO PESOS M/CTE";

  const entero = Math.floor(Math.abs(numeric));
  let letras = Millones(entero);

  letras = letras.replace(/\s+/g, " ").trim();

  if (letras.endsWith("MILLÓN") || letras.endsWith("MILLONES")) {
    return `${letras} DE PESOS M/CTE`;
  }

  return `${letras} PESOS M/CTE`;
}
