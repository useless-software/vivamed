import { describe, expect, it } from "vitest";
import { computeFiscalCode, isValidFiscalCode, nameCode, surnameCode } from "@/lib/codice-fiscale";

const date = (iso: string) => new Date(`${iso}T00:00:00.000Z`);

describe("codice fiscale", () => {
  it("calcola il codice dell'esempio classico (Mario Rossi)", () => {
    expect(
      computeFiscalCode({
        firstName: "Mario",
        lastName: "Rossi",
        sex: "M",
        birthDate: date("1985-12-10"),
        birthPlaceCode: "A562",
      }),
    ).toBe("RSSMRA85T10A562S");
  });

  it("per le donne aggiunge 40 al giorno di nascita", () => {
    const code = computeFiscalCode({
      firstName: "Maria",
      lastName: "Rossi",
      sex: "F",
      birthDate: date("1990-01-05"),
      birthPlaceCode: "H501",
    });
    expect(code.slice(9, 11)).toBe("45");
    expect(code.slice(6, 9)).toBe("90A");
    expect(isValidFiscalCode(code)).toBe(true);
  });

  it("gestisce cognomi e nomi corti, accenti e apostrofi", () => {
    expect(surnameCode("Fo")).toBe("FOX");
    expect(surnameCode("D'Amico")).toBe("DMC");
    expect(nameCode("Nicolò")).toBe("NCL");
    expect(nameCode("Lu")).toBe("LUX");
  });

  it("con 4 o più consonanti nel nome salta la seconda", () => {
    expect(nameCode("Gianfranco")).toBe("GFR");
    expect(nameCode("Marco")).toBe("MRC");
  });

  it("riconosce codici validi, anche omocodici, e rifiuta quelli errati", () => {
    expect(isValidFiscalCode("RSSMRA85T10A562S")).toBe(true);
    expect(isValidFiscalCode("rssmra85t10a562s")).toBe(true);
    expect(isValidFiscalCode("RSSMRA85T10A562X")).toBe(false);
    expect(isValidFiscalCode("RSSMRA85T10A562")).toBe(false);
    // Omocodia: l'ultima cifra del comune (2) diventa N, e il controllo cambia di conseguenza.
    const omo = "RSSMRA85T10A56N";
    const valid = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"].find((c) => isValidFiscalCode(omo + c));
    expect(valid).toBeDefined();
  });
});
