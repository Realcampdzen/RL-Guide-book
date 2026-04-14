const fs = require('fs');
const postcss = require('postcss');

const SOURCE_FILES = ['src/styles/profile-view-spaceship.css', 'src/styles/profile-view.css'];

const EXTRACTIONS = [
    { target: 'src/styles/WorkshopContainer.css', matchers: ['.workshop-'] },
    { target: 'src/styles/Shelf.css', matchers: ['.shelf-', '.favorites-shelf', '.badge-row'] },
    { target: 'src/styles/SpaceshipButtons.css', matchers: ['.btn-secondary', '.btn-pill', '.btn-primary', '.btn-action'] },
    { target: 'src/styles/Profile4K.css', matchers: ['.profile4k-', '.profile-route', '.profile-plan', '.profile-role', '.profile-utility', '.profile-sandbox'] },
    { target: 'src/styles/ShareCenter.css', matchers: ['.share-center'] },
    { target: 'src/styles/SquadCorner.css', matchers: ['.real-diary'] },
    { target: 'src/styles/TeamContainer.css', matchers: ['.team-path', '.profile-organizer', '.organizer-empty'] },
    { target: 'src/styles/Vozhatificator.css', matchers: ['.vozhatifikator-toc', '.vozhatifikator-badge'] },
];

async function processCSS() {
    for (const sourceFile of SOURCE_FILES) {
        if (!fs.existsSync(sourceFile)) continue;
        let css = fs.readFileSync(sourceFile, 'utf8');
        let root = postcss.parse(css);

        for (const extraction of EXTRACTIONS) {
            let targetRoot;
            if (fs.existsSync(extraction.target)) {
                targetRoot = postcss.parse(fs.readFileSync(extraction.target, 'utf8'));
            } else {
                targetRoot = postcss.root();
            }

            let nodesExtracted = 0;

            root.walkRules(rule => {
                const matches = extraction.matchers.some(m => rule.selector.includes(m));
                if (matches) {
                    if (rule.parent && rule.parent.type === 'atrule') {
                        let targetAtRule = null;
                        targetRoot.walkAtRules(rule.parent.name, atRule => {
                            if (atRule.params === rule.parent.params) {
                                targetAtRule = atRule;
                            }
                        });
                        
                        if (!targetAtRule) {
                            targetAtRule = postcss.atRule({ name: rule.parent.name, params: rule.parent.params });
                            targetRoot.append(targetAtRule);
                        }
                        targetAtRule.append(rule.clone());
                    } else {
                        targetRoot.append(rule.clone());
                    }
                    rule.remove();
                    nodesExtracted++;
                }
            });

            if (nodesExtracted > 0) {
                fs.writeFileSync(extraction.target, targetRoot.toString());
                console.log(`Extracted ${nodesExtracted} rules to ${extraction.target} from ${sourceFile}`);
            }
        }

        // Cleanup empty at-rules in original file
        root.walkAtRules(atRule => {
            if (atRule.nodes && atRule.nodes.length === 0) {
                atRule.remove();
            }
        });

        fs.writeFileSync(sourceFile, root.toString());
        console.log(`Updated ${sourceFile}.`);
    }
}

processCSS().catch(console.error);
