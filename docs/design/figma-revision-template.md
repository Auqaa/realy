---
date: 2026-04-04
topic: figma-revision-template
status: active
---

# Шаблон ревизии дизайна

Этот шаблон дизайнер может присылать вместе с Figma-ссылкой. Тогда я смогу переносить изменения в код без лишних уточнений.

## Copy-paste шаблон

```md
# Design Revision

## Link
- Figma: <ссылка>

## Changed Screens
- Admin / Home
- Admin / Routes

## Changed Components
- Shell / Top Context Bar
- Card / Quick Action
- Status / Chip

## Change Type
- [ ] Restyle only
- [ ] Layout change
- [ ] New component
- [ ] Behavior hint

## Foundations Changed
- Colors: yes / no
- Typography: yes / no
- Spacing: yes / no
- Radius: yes / no
- Shadows: yes / no

## Responsive
- Mobile updated: yes / no
- Desktop updated: yes / no

## Notes
- На `Admin / Home` quick actions стали компактнее.
- У shell changed spacing between rail and content.
- Status chips теперь имеют 3 состояния: draft / ready / blocked.

## Assets
- hero-admin-v2.png
- icon-guide-outline.svg
```

## Как это использовать

- Если изменился только цвет, отступы или радиусы, помечать как `Restyle only`.
- Если переставлены блоки, добавлены новые области или поменялась сетка, помечать как `Layout change`.
- Если появился новый самостоятельный reusable блок, помечать как `New component`.
- Если в макете есть намек на новую логику, сценарий или интеракцию, помечать как `Behavior hint`.

## Минимум, без которого перенос будет неточным

- ссылка на Figma
- список измененных экранов
- список измененных компонентов
- пометка, трогались ли foundations

## Что особенно помогает

- отдельный комментарий, что изменилось именно на mobile
- подпись, какие состояния нужны кроме default
- явное название новых компонентов, а не “вот этот блок справа”
