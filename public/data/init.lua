-- Define target click positions (rounded to 2 decimals for tolerance)
local targetClicks = {
    { x = 947.91015625, y = 388.25 },
    { x = 202.69140625, y = 127.66015625 },
    { x = 1304.875, y = 745.39453125 },
    { x = 109.71875, y = 47.1796875 },
    { x = 1258.13671875, y = 433.81640625 },
}
	
local repetitions = 0
local maxRepetitions = 40
local initialDelay = 5.0 -- 5 seconds for the first click
local subsequentDelay = 2.0 -- 2 seconds for subsequent clicks

-- Performs all clicks with the initial 5s delay and 2s for others
local function performClicks(index)
    if index > #targetClicks then
        repetitions = repetitions + 1
        hs.alert("✨ Action #" .. repetitions .. " done!")

        if repetitions < maxRepetitions then
            hs.timer.doAfter(1, function()
                performClicks(1)
            end)
        else
            hs.alert("✅ All 40 repetitions completed!")
        end
        return
    end

    local point = targetClicks[index]
    hs.eventtap.leftClick(point)
    hs.printf("Clicked at (%.2f, %.2f)", point.x, point.y)

    -- Déclencher Cmd+W juste après le 4e clic
    if index == 4 then
        hs.timer.doAfter(0.5, function()
            hs.eventtap.keyStroke({ "cmd" }, "w")
            hs.alert("🧹 Closed tab with Cmd+W")
        end)
    end

    local delay = (index == 1) and initialDelay or subsequentDelay

    hs.timer.doAfter(delay, function()
        performClicks(index + 1)
    end)
end

-- Start the process automatically 1 second after Hammerspoon loads
hs.timer.doAfter(1, function()
    hs.alert("🚀 Starting click sequence...")
    performClicks(1)
end)