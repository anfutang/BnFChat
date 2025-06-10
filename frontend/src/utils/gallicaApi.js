// gallicaApi.js

const targetDcTags = ["creator", "description", "subject", "title", "type", "contributor", "date"];
const baseGallicaUrl = "https://gallica.bnf.fr/SRU?version=1.2&operation=searchRetrieve&query={sruQuery}&maximumRecords={maximumRecords}&startRecord={startRecord}";

function buildUrl(query, startRecord = 1, maximumRecords = 5) {
  return baseGallicaUrl
    .replace("{sruQuery}", encodeURIComponent(query))
    .replace("{maximumRecords}", maximumRecords)
    .replace("{startRecord}", startRecord);
}

async function buildSearchResultSinglePage(url) {
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "Accept": "application/xml",
      }
    });

    const text = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(text, "text/xml");

    const recordElements = xmlDoc.getElementsByTagNameNS("http://www.loc.gov/zing/srw/", "record");
    const records = [];

    for (let record of recordElements) {
      const data = {};
      const dcElements = record.getElementsByTagNameNS("http://purl.org/dc/elements/1.1/", "*");

      for (let elem of dcElements) {
        const tag = elem.localName;
        const value = elem.textContent?.trim();
        if (targetDcTags.includes(tag) && value) {
          if (!data[tag]) data[tag] = [];
          data[tag].push(value);
        }
      }

      const joinedData = {};
      for (let [key, values] of Object.entries(data)) {
        joinedData[key] = values.join(" | ");
      }

      records.push(joinedData);
    }

    return [true, records];
  } catch (e) {
    console.error("Error in parsing the xml data returned by the SRU API of Gallica.", e);
    return [false, []];
  }
}

export async function retrieveResultPage(sru_query_with_clarif, sru_query_without_clarif) {
  const url_wc = buildUrl(sru_query_with_clarif);
  const url_woc = buildUrl(sru_query_without_clarif);

  const [success_wc, records_wc] = await buildSearchResultSinglePage(url_wc);
  const [success_woc, records_woc] = await buildSearchResultSinglePage(url_woc);

  if (!success_wc) throw new Error("Une erreur s'est produite avec clarification.");
  if (!success_woc) throw new Error("Une erreur s'est produite sans clarification.");

  return [records_wc, records_woc];
}
