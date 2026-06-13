import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'

const app = express()
app.use(express.json())

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PORT = process.env.PORT || 7121

let url_ref = {
    bt_2_reg_25: "https://results.indiaresults.com/hp/himtu/hp-himtu/mquery.aspx?id=1800266728",
}

app.post('/get-data', async (req, res) => {
    const json_data = req.body

    console.log("Received data:", json_data)
    console.log("Total rolls to process:", json_data.roll_list.length)

    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('Access-Control-Allow-Origin', '*')

    try {
        const rollsJson = JSON.stringify(json_data.roll_list)
        const compactJson = rollsJson.replace(/\s+/g, '')

        // removed url param
        const api_url = `http://127.0.0.1:8000/results/stream?rolls=${encodeURIComponent(compactJson)}`

        console.log("URL:", decodeURIComponent(api_url))

        const response = await fetch(api_url)
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
        if (!response.body) throw new Error('No response body from FastAPI')

        const reader = response.body.getReader()
        const decoder = new TextDecoder('utf-8')

        let buffer = ""

        while (true) {
            const { value, done } = await reader.read()
            if (done) {
                console.log("stream completed from FastAPI")
                break
            }

            buffer += decoder.decode(value, { stream: true })

            let parts = buffer.split("\n\n")
            buffer = parts.pop() // keep incomplete chunk

            for (let part of parts) {
                if (part.startsWith("data:")) {
                    const jsonStr = part.replace(/^data:\s*/, '')

                    try {
                        const jsonObj = JSON.parse(jsonStr)
                        console.log("JSON object:", jsonObj)
                    } catch (err) {
                        console.error("JSON parse error:", err)
                    }
                }

                // forward to client
                res.write(part + "\n\n")
            }
        }

        res.end()

    } catch (error) {
        console.error("Error in /get-data:", error)
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`)
        res.end()
    }
})

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'trying_deep4_8.html'))
})

app.get("/about-us", (req, res) => {
    res.sendFile(path.join(__dirname, 'about_me.html'))
})

app.use((req, res) => {
    res.status(404).sendFile(path.join(__dirname, 'error.html'))
})

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`)
})
