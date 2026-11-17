# IndexNow setup

IndexNow notification is optional and is sent only by the product-created
Cloud Function when both configuration values are valid. It is best-effort and
never blocks a product write.

Configure the Functions runtime environment without committing credentials:

```text
INDEXNOW_KEY=<the key issued by an IndexNow-supported search engine>
INDEXNOW_KEY_LOCATION=https://pridecircuit.in/<same-key>.txt
```

The exact key value must also be published as plain text at the configured
`INDEXNOW_KEY_LOCATION` (for example, add `public/<same-key>.txt` containing
only the key and deploy Hosting). The location must remain an HTTPS URL on
`pridecircuit.in`. Configure the values in the Functions environment before
deploying the Functions code. No notification is sent while either value is
missing or invalid.

This is only a request for discovery; IndexNow does not guarantee crawling,
indexing, rankings, or a particular response time.
