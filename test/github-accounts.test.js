const assert = require("node:assert/strict");
const test = require("node:test");

function getLinkedAccountsFilter(accounts) {
  return accounts.filter((account) => account !== null);
}

function getLinkedAccountsMap(rows) {
  return rows
    .map((row) => {
      if (!row.token) {
        return null;
      }
      return {
        githubId: row.githubId || "",
        githubLogin: row.githubLogin || "",
        token: row.token,
      };
    })
    .filter((account) => account !== null);
}

test("getLinkedAccountsFilter handles empty array", () => {
  const result = getLinkedAccountsFilter([]);
  assert.deepEqual(result, []);
});

test("getLinkedAccountsFilter removes null values", () => {
  const accounts = [
    { githubId: "1", githubLogin: "user1", token: "token1" },
    null,
    { githubId: "2", githubLogin: "user2", token: "token2" },
  ];
  const result = getLinkedAccountsFilter(accounts);
  assert.equal(result.length, 2);
});

test("getLinkedAccountsFilter handles all null values", () => {
  const result = getLinkedAccountsFilter([null, null]);
  assert.deepEqual(result, []);
});

test("getLinkedAccountsMap removes entries with missing token", () => {
  const rows = [
    { githubId: "1", githubLogin: "user1", token: "token1" },
    { githubId: "2", githubLogin: "user2", token: null },
    { githubId: "3", githubLogin: "user3", token: "token3" },
  ];
  const result = getLinkedAccountsMap(rows);
  assert.equal(result.length, 2);
});

test("getLinkedAccountsMap uses default for missing githubId", () => {
  const rows = [{ githubLogin: "user1", token: "token1" }];
  const result = getLinkedAccountsMap(rows);
  assert.equal(result[0].githubId, "");
});

test("getLinkedAccountsMap uses default for missing githubLogin", () => {
  const rows = [{ githubId: "1", token: "token1" }];
  const result = getLinkedAccountsMap(rows);
  assert.equal(result[0].githubLogin, "");
});

test("getLinkedAccountsMap preserves valid entries", () => {
  const rows = [
    { githubId: "1", githubLogin: "user1", token: "token1" },
    { githubId: "2", githubLogin: "user2", token: "token2" },
  ];
  const result = getLinkedAccountsMap(rows);
  assert.equal(result.length, 2);
  assert.equal(result[0].githubId, "1");
  assert.equal(result[1].githubId, "2");
});