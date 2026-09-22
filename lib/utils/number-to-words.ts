// ============================================================
// lib/utils/number-to-words.ts
// Converts numbers to Indian Rupee words format (Lakhs & Crores)
// e.g., 150000 -> "Rupees One Lakh Fifty Thousand Only"
// ============================================================

const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
]

const TENS = [
  '',
  '',
  'Twenty',
  'Thirty',
  'Forty',
  'Fifty',
  'Sixty',
  'Seventy',
  'Eighty',
  'Ninety',
]

function convertBelowThousand(n: number): string {
  if (n === 0) return ''
  if (n < 20) return ONES[n]
  if (n < 100) {
    return TENS[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + ONES[n % 10] : '')
  }
  return (
    ONES[Math.floor(n / 100)] +
    ' Hundred' +
    (n % 100 !== 0 ? ' ' + convertBelowThousand(n % 100) : '')
  )
}

/**
 * Converts a numeric amount to Indian Rupee words representation.
 * Supports up to Crores.
 */
export function numberToRupeeWords(amount: number): string {
  if (isNaN(amount) || amount === 0) {
    return 'Rupees Zero Only'
  }

  const rounded = Math.round(amount * 100) / 100
  const rupees = Math.floor(rounded)
  const paise = Math.round((rounded - rupees) * 100)

  let result = ''

  if (rupees > 0) {
    let num = rupees

    const crores = Math.floor(num / 10000000)
    num %= 10000000

    const lakhs = Math.floor(num / 100000)
    num %= 100000

    const thousands = Math.floor(num / 1000)
    num %= 1000

    const remainder = num

    if (crores > 0) {
      result += convertBelowThousand(crores) + ' Crore '
    }

    if (lakhs > 0) {
      result += convertBelowThousand(lakhs) + ' Lakh '
    }

    if (thousands > 0) {
      result += convertBelowThousand(thousands) + ' Thousand '
    }

    if (remainder > 0) {
      result += convertBelowThousand(remainder)
    }

    result = 'Rupees ' + result.trim()
  }

  if (paise > 0) {
    const paiseText = convertBelowThousand(paise) + ' Paise'
    if (result) {
      result += ' and ' + paiseText
    } else {
      result = paiseText
    }
  }

  return result ? result.trim() + ' Only' : 'Rupees Zero Only'
}

export function formatRupeeWords(amountPaiseOrRupees: number): string {
  // If amount is greater than 100000 and integer, assume it's in paise if needed or handle rupees
  const rupees = amountPaiseOrRupees > 999 && Number.isInteger(amountPaiseOrRupees)
    ? amountPaiseOrRupees / 100
    : amountPaiseOrRupees;
  return numberToRupeeWords(rupees);
}

