import * as yaml from 'js-yaml'
import * as t from 'io-ts'
import reporter from 'io-ts-reporters'
import {isRight} from 'fp-ts/Either'
import {GitHub} from '@actions/github/lib/utils'
import * as github from '@actions/github'

const Matcher = t.partial({
  title: t.string,
  body: t.string,
  comment: t.string,
  commits: t.string,
  branch: t.string,
  files: t.union([
    t.string,
    t.array(t.string),
    t.partial({
      any: t.array(t.string),
      all: t.array(t.string),
      count: t.partial({
        lte: t.number,
        gte: t.number,
        eq: t.number,
        neq: t.number
      })
    })
  ])
})

const Label = t.type({
  label: t.string,
  matcher: t.union([Matcher, t.undefined])
})

const Check = t.intersection([
  t.type({
    context: t.string
  }),
  t.partial({
    url: t.string,
    description: t.union([
      t.string,
      t.partial({
        success: t.string,
        failure: t.string
      })
    ]),
    labels: t.partial({
      any: t.array(t.string),
      all: t.array(t.string)
    })
  })
])

const Config = t.intersection([
  t.type({
    version: t.literal('v1')
  }),
  t.partial({
    labels: t.array(Label),
    checks: t.array(Check)
  })
])

export type Matcher = t.TypeOf<typeof Matcher>
export type Label = t.TypeOf<typeof Label>
export type Check = t.TypeOf<typeof Check>
export type Config = t.TypeOf<typeof Config>

export function parse(content: string): Config {
  const config: any = yaml.load(content)

  const decoded = Config.decode(config)
  if (isRight(decoded)) {
    return decoded.right
  } else {
    throw new Error(
      `labeler.yml parse error:\\n${reporter.report(decoded).join('\\n')}`
    )
  }
}

export async function getConfig(
  client: InstanceType<typeof GitHub>,
  configPath: string
): Promise<Config> {
  const response: any = await client.repos.getContent({
    owner: github.context.repo.owner,
    repo: github.context.repo.repo,
    ref: github.context.sha,
    path: configPath
  })

  const content: string = await Buffer.from(
    response.data.content,
    response.data.encoding
  ).toString()
  return parse(content)
}
