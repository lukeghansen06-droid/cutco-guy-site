// tests/app.test.js
import { test, expect } from "bun:test";
import { activeNav } from "../assets/app.js";
test("maps paths to nav keys", () => {
  expect(activeNav("/")).toBe("home");
  expect(activeNav("/book")).toBe("book");
  expect(activeNav("/find")).toBe("find");
  expect(activeNav("/reviews")).toBe("reviews");
  expect(activeNav("/unknown")).toBe("");
});
